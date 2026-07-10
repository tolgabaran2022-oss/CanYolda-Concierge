import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextType = {
  preference:     ThemePreference;
  resolvedScheme: "light" | "dark";
  setTheme:       (pref: ThemePreference) => void;
};

const STORAGE_KEY = "@theme_preference";

export const ThemeContext = createContext<ThemeContextType>({
  preference:     "system",
  resolvedScheme: "light",
  setTheme:       () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setPreference(val);
      }
    });
  }, []);

  const setTheme = useCallback((pref: ThemePreference) => {
    setPreference(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const resolvedScheme: "light" | "dark" =
    preference === "system" ? (systemScheme ?? "light") : preference;

  return (
    <ThemeContext.Provider value={{ preference, resolvedScheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
