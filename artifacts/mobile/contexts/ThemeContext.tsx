import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextType = {
  preference:     ThemePreference;
  resolvedScheme: "light" | "dark";
  setTheme:       (pref: ThemePreference) => void;
};

const STORAGE_KEY = "@theme_preference";

/* Read ?theme=light|dark from the URL (web only) to allow iframe forced theme */
function getUrlThemeOverride(): "light" | "dark" | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("theme");
  if (param === "light" || param === "dark") return param;
  return null;
}

export const ThemeContext = createContext<ThemeContextType>({
  preference:     "system",
  resolvedScheme: "light",
  setTheme:       () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const urlOverride  = getUrlThemeOverride();
  const [preference, setPreference] = useState<ThemePreference>(urlOverride ?? "system");

  useEffect(() => {
    if (urlOverride) return; /* URL param wins; skip AsyncStorage */
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setPreference(val);
      }
    });
  }, [urlOverride]);

  const setTheme = useCallback((pref: ThemePreference) => {
    if (urlOverride) return; /* locked by URL param */
    setPreference(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, [urlOverride]);

  const resolvedScheme: "light" | "dark" =
    urlOverride ?? (preference === "system" ? (systemScheme ?? "light") : preference);

  return (
    <ThemeContext.Provider value={{ preference, resolvedScheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
