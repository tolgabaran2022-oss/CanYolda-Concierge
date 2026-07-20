import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiSyncProfile, apiUpdateProfile } from "@/lib/socialApi";
import { initializeRevenueCat, loginRevenueCat, logoutRevenueCat } from "@/services/revenueCat";
import { registerForPushNotifications, deregisterPushToken } from "@/services/notifications";

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
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
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

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(`Sunucudan beklenmedik yanıt alındı (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

const DEMO_USER: User = {
  id:       "demo-preview-user",
  name:     "Ayşe Kaya",
  email:    "ayse@canyoldasi.app",
  username: "aysekaya",
  bio:      "İstanbul'da sokak hayvanlarını seven biri 🐾",
  location: "İstanbul, Türkiye",
  avatar:   null,
  provider: "local",
};

function isPreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("preview") === "true";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(isPreviewMode() ? DEMO_USER : null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isPreviewMode());

  /* ── Restore session on boot ──────────────────────────── */
  useEffect(() => {
    if (isPreviewMode()) return;
    Promise.all([
      AsyncStorage.getItem(AUTH_KEY),
      AsyncStorage.getItem(TOKEN_KEY),
    ])
      .then(([userData, tokenData]) => {
        const restoredUser: User | null = userData ? JSON.parse(userData) : null;
        if (restoredUser) setUser(restoredUser);
        if (tokenData) setToken(tokenData);
        /* Initialize RC with the restored user UUID (non-blocking) */
        initializeRevenueCat(restoredUser?.id ?? null).catch(() => {});
      })
      .finally(() => setIsLoading(false));
  }, []);

  /* ── Register ─────────────────────────────────────────── */
  const register = useCallback(
    async (name: string, email: string, password: string, phone: string) => {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await safeJson<{ error?: string; token?: string; user?: { id: string; email: string; name: string; avatar?: string | null } }>(res);
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
      setToken(data.token!);

      /* Sync social profile (non-blocking) */
      apiSyncProfile({ id: safe.id, email: safe.email, name: safe.name }).catch(() => {});
      /* Associate RevenueCat identity with the new user UUID (non-blocking) */
      loginRevenueCat(safe.id).catch(() => {});
      /* Register device push token (non-blocking; silently skips on web/simulator) */
      registerForPushNotifications(data.token!).catch(() => {});
    },
    []
  );

  /* ── Login ────────────────────────────────────────────── */
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson<{ error?: string; token?: string; user?: { id: string; email: string; name: string; avatar?: string | null } }>(res);
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
    setToken(data.token!);

    /* Sync social profile (non-blocking) */
    apiSyncProfile({
      id:        safe.id,
      email:     safe.email,
      name:      safe.name,
      avatarUrl: safe.avatar?.startsWith("http") ? safe.avatar : undefined,
    }).catch(() => {});
    /* Associate RevenueCat identity with the authenticated user UUID (non-blocking) */
    loginRevenueCat(safe.id).catch(() => {});
    /* Register device push token (non-blocking; silently skips on web/simulator) */
    registerForPushNotifications(data.token!).catch(() => {});
  }, []);

  /* ── Logout ───────────────────────────────────────────── */
  const logout = useCallback(async () => {
    /* Deregister push token before clearing credentials (non-blocking) */
    const storedToken = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
    if (storedToken) deregisterPushToken(storedToken).catch(() => {});

    await Promise.all([
      AsyncStorage.removeItem(AUTH_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
    ]);
    /* Reset RevenueCat identity before clearing local state (non-blocking) */
    logoutRevenueCat().catch(() => {});
    setUser(null);
    setToken(null);
  }, []);

  /* ── Change password ──────────────────────────────────── */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error("Giriş yapılmamış.");
      if (user.provider && user.provider !== "local") {
        throw new Error("Sosyal hesaplarda şifre değiştirilemez.");
      }
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await safeJson<{ error?: string }>(res);
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
      if (updates.avatar === null) {
        apiUpdates.avatarUrl = "";
      } else if (updates.avatar && updates.avatar.startsWith("http")) {
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
      const res = await apiFetch("/social/settings");
      if (!res.ok) return { ...DEFAULT_SETTINGS };
      const data = await safeJson<Partial<UserSettings>>(res);
      return { ...DEFAULT_SETTINGS, ...data };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }, [user]);

  /* ── Update settings ──────────────────────────────────── */
  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) throw new Error("Giriş yapılmamış.");
    const res = await apiFetch("/social/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
    const data = await safeJson<{ error?: string }>(res);
    if (!res.ok) throw new Error(data.error ?? "Ayarlar kaydedilemedi.");
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, changePassword, updateProfile, getSettings, updateSettings }}
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
