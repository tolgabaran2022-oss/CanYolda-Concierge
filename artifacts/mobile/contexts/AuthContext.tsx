import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { generateId } from "@/utils/formatters";
import { apiSyncProfile, apiUpdateProfile } from "@/lib/socialApi";

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

interface StoredUser extends User {
  password?: string;
}

export type ProfileUpdates = Partial<Pick<User, "name" | "username" | "bio" | "location" | "avatar">>;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY  = "@canyoldasi:auth";
const TOKEN_KEY = "@canyoldasi:jwt";
const USERS_KEY = "@canyoldasi:users";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((data) => { if (data) setUser(JSON.parse(data)); })
      .finally(() => setIsLoading(false));
  }, []);

  /* ── Local register ───────────────────────────── */
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const exists = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (exists) throw new Error("Bu e-posta adresi zaten kullanılıyor.");

      const newUser: StoredUser = {
        id: generateId(),
        name,
        email: email.toLowerCase(),
        password,
        provider: "local",
      };
      users.push(newUser);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      const { password: _p, ...safe } = newUser;
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safe));
      setUser(safe);
      /* Sync to backend (non-blocking) */
      apiSyncProfile({ id: safe.id, email: safe.email, name: safe.name }).catch(() => {});
    },
    []
  );

  /* ── Local login ──────────────────────────────── */
  const login = useCallback(async (email: string, password: string) => {
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
    const found = users.find(
      (u) =>
        u.email?.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );
    if (!found) throw new Error("E-posta veya şifre hatalı.");
    const { password: _p, ...safe } = found;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safe));
    setUser(safe);
    /* Sync profile to backend (non-blocking) */
    apiSyncProfile({
      id:        safe.id,
      email:     safe.email,
      name:      safe.name,
      username:  safe.username,
      bio:       safe.bio,
      location:  safe.location,
      avatarUrl: safe.avatar && safe.avatar.startsWith("http") ? safe.avatar : undefined,
    }).catch(() => {});
  }, []);

  /* ── Logout ───────────────────────────────────── */
  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
    ]);
    setUser(null);
  }, []);

  /* ── Change password (local only) ────────────── */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error("Giriş yapılmamış.");
      if (user.provider && user.provider !== "local") {
        throw new Error("Sosyal hesaplarda şifre değiştirilemez.");
      }
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx === -1) throw new Error("Kullanıcı bulunamadı.");
      if (users[idx].password !== currentPassword) throw new Error("Mevcut şifre hatalı.");
      users[idx].password = newPassword;
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    },
    [user]
  );

  /* ── Update profile ───────────────────────────── */
  const updateProfile = useCallback(
    async (updates: ProfileUpdates) => {
      if (!user) throw new Error("Giriş yapılmamış.");
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx === -1) throw new Error("Kullanıcı bulunamadı.");

      if (updates.username && updates.username !== user.username) {
        /* Check uniqueness locally */
        const taken = users.some(
          (u) => u.id !== user.id && u.username === updates.username
        );
        if (taken) throw new Error("Bu kullanıcı adı zaten kullanılıyor.");
      }

      /* Sync to backend — this also validates username uniqueness server-side */
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
          /* First ensure profile exists in backend */
          await apiSyncProfile({ id: user.id, email: user.email });
          await apiUpdateProfile(user.id, apiUpdates);
        } catch (err) {
          /* Re-throw meaningful errors (username conflict), ignore network errors */
          if (err instanceof Error && err.message.includes("kullanıcı adı")) throw err;
        }
      }

      const merged = { ...users[idx], ...updates };
      users[idx] = merged;
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      const { password: _p, ...safe } = merged;
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safe));
      setUser(safe);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, changePassword, updateProfile }}
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
