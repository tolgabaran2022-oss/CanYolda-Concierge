import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiSyncProfile, apiUpdateProfile } from "@/lib/socialApi";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  bio?: string;
  location?: string;
  avatar?: string | null;
  provider?: "local" | "google" | "apple" | "facebook";
}

export interface UserSettings {
  isProfilePublic:             boolean;
  areStoriesVisible:           boolean;
  likeNotificationsEnabled:    boolean;
  commentNotificationsEnabled: boolean;
  messageNotificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  isProfilePublic:             true,
  areStoriesVisible:           true,
  likeNotificationsEnabled:    true,
  commentNotificationsEnabled: true,
  messageNotificationsEnabled: true,
};

export type ProfileUpdates = Partial<Pick<User, "name" | "username" | "bio" | "location" | "avatar">>;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<void>;
  getSettings: () => Promise<UserSettings>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY  = "@canyoldasi:auth";
const TOKEN_KEY = "@canyoldasi:jwt";

/* ── helpers ───────────────────────────────────────────── */

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Restore session on boot ──────────────────────────── */
  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((data) => { if (data) setUser(JSON.parse(data)); })
      .finally(() => setIsLoading(false));
  }, []);

  /* ── Register ─────────────────────────────────────────── */
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json() as { error?: string; token?: string; user?: { id: string; email: string; name: string; avatar?: string | null } };
      if (!res.ok) throw new Error(data.error ?? "Kayıt başarısız.");

      const safe: User = {
        id:       data.user!.id,
        name:     data.user!.name,
        email:    data.user!.email,
        avatar:   data.user!.avatar ?? null,
        provider: "local",
      };
      await AsyncStorage.setItem(TOKEN_KEY, data.token!);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safe));
      setUser(safe);

      /* Sync social profile (non-blocking) */
      apiSyncProfile({ id: safe.id, email: safe.email, name: safe.name }).catch(() => {});
    },
    []
  );

  /* ── Login ────────────────────────────────────────────── */
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { error?: string; token?: string; user?: { id: string; email: string; name: string; avatar?: string | null } };
    if (!res.ok) throw new Error(data.error ?? "Giriş başarısız.");

    const safe: User = {
      id:       data.user!.id,
      name:     data.user!.name,
      email:    data.user!.email,
      avatar:   data.user!.avatar ?? null,
      provider: "local",
    };
    await AsyncStorage.setItem(TOKEN_KEY, data.token!);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safe));
    setUser(safe);

    /* Sync social profile (non-blocking) */
    apiSyncProfile({
      id:        safe.id,
      email:     safe.email,
      name:      safe.name,
      avatarUrl: safe.avatar?.startsWith("http") ? safe.avatar : undefined,
    }).catch(() => {});
  }, []);

  /* ── Logout ───────────────────────────────────────────── */
  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
    ]);
    setUser(null);
  }, []);

  /* ── Change password ──────────────────────────────────── */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error("Giriş yapılmamış.");
      if (user.provider && user.provider !== "local") {
        throw new Error("Sosyal hesaplarda şifre değiştirilemez.");
      }
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Şifre değiştirilemedi.");
    },
    [user]
  );

  /* ── Update profile ───────────────────────────────────── */
  const updateProfile = useCallback(
    async (updates: ProfileUpdates) => {
      if (!user) throw new Error("Giriş yapılmamış.");

      const apiUpdates: Record<string, string | undefined> = {};
      if (updates.name     !== undefined) apiUpdates.name     = updates.name;
      if (updates.username !== undefined) apiUpdates.username = updates.username;
      if (updates.bio      !== undefined) apiUpdates.bio      = updates.bio;
      if (updates.location !== undefined) apiUpdates.location = updates.location;
      if (updates.avatar && updates.avatar.startsWith("http")) {
        apiUpdates.avatarUrl = updates.avatar;
      }
      if (Object.keys(apiUpdates).length > 0) {
        try {
          await apiSyncProfile({ id: user.id, email: user.email });
          await apiUpdateProfile(user.id, apiUpdates);
        } catch (err) {
          if (err instanceof Error && err.message.includes("kullanıcı adı")) throw err;
        }
      }

      const merged: User = { ...user, ...updates };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(merged));
      setUser(merged);
    },
    [user]
  );

  /* ── Get settings ─────────────────────────────────────── */
  const getSettings = useCallback(async (): Promise<UserSettings> => {
    if (!user) return { ...DEFAULT_SETTINGS };
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const res = await apiFetch("/social/settings", {
        headers: {
          "x-user-id": user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return { ...DEFAULT_SETTINGS };
      const data = await res.json() as Partial<UserSettings>;
      return { ...DEFAULT_SETTINGS, ...data };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }, [user]);

  /* ── Update settings ──────────────────────────────────── */
  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) throw new Error("Giriş yapılmamış.");
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const res = await apiFetch("/social/settings", {
      method: "PATCH",
      headers: {
        "x-user-id": user.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(settings),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Ayarlar kaydedilemedi.");
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, changePassword, updateProfile, getSettings, updateSettings }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
