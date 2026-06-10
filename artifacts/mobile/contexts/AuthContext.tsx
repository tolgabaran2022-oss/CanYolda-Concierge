import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { generateId } from "@/utils/formatters";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface StoredUser extends User {
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "@canyoldasi:auth";
const USERS_KEY = "@canyoldasi:users";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((data) => {
        if (data) setUser(JSON.parse(data));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const exists = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) throw new Error("Bu e-posta adresi zaten kullanılıyor.");
      const newUser: StoredUser = {
        id: generateId(),
        name,
        email: email.toLowerCase(),
        password,
      };
      users.push(newUser);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      const { password: _p, ...safe } = newUser;
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safe));
      setUser(safe);
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );
    if (!found) throw new Error("E-posta veya şifre hatalı.");
    const { password: _p, ...safe } = found;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safe));
    setUser(safe);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
