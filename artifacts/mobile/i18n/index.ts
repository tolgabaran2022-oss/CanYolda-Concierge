import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import tr from "./resources/tr.json";
import en from "./resources/en.json";

export const SUPPORTED_LANGUAGES = [
  { code: "tr", nativeLabel: "Türkçe", shortLabel: "TR" },
  { code: "en", nativeLabel: "English",  shortLabel: "EN" },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]["code"];

export const LANGUAGE_KEY = "@canyoldasi/language";

/** Normalize "tr-TR", "en-US", "en-GB" → "tr" | "en", fallback "tr" */
function normalize(raw: string): LangCode {
  const base = raw.split("-")[0]?.toLowerCase() ?? "";
  if (base === "tr") return "tr";
  if (base === "en") return "en";
  return "tr";
}

/** Detect device locale without expo-localization */
function getDeviceLocale(): string {
  try {
    if (Platform.OS === "ios") {
      const locale: string =
        NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ??
        "tr";
      return locale;
    }
    if (Platform.OS === "android") {
      return NativeModules.I18nManager?.localeIdentifier ?? "tr";
    }
    // Web
    return (typeof navigator !== "undefined" && navigator.language) ? navigator.language : "tr";
  } catch {
    return "tr";
  }
}

/** Load saved language; defaults to "tr" (this is a Turkish community app). */
export async function detectLanguage(): Promise<LangCode> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved === "tr" || saved === "en") return saved;
  } catch {
    // AsyncStorage unavailable — continue
  }
  return "tr";
}

/** Persist and apply a language change */
export async function applyLanguage(code: LangCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
  await i18n.changeLanguage(code);
}

let _initialized = false;

/**
 * Initialize i18n exactly once.
 * Call this before rendering any UI (root _layout.tsx).
 */
export async function initI18n(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  const lng = await detectLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: { tr: { translation: tr }, en: { translation: en } },
      lng,
      fallbackLng:            "tr",
      supportedLngs:          ["tr", "en"],
      load:                   "languageOnly",
      interpolation:          { escapeValue: false },
      returnNull:             false,
      returnEmptyString:      false,
      saveMissing:            __DEV__,
      missingKeyHandler: (lngs, _ns, key) => {
        if (__DEV__) {
          console.warn(`[i18n] Missing key "${key}" for languages: ${lngs.join(", ")}`);
        }
      },
    });
}

export default i18n;
