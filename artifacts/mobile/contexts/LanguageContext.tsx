import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, LangCode, applyLanguage } from "@/i18n";

interface LanguageContextValue {
  currentLanguage:    LangCode;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  changeLanguage:     (code: LangCode) => Promise<void>;
  isLanguageReady:    boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [isLanguageReady, setIsLanguageReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      setIsLanguageReady(true);
      return;
    }
    const onInit = () => setIsLanguageReady(true);
    i18n.on("initialized", onInit);
    return () => { i18n.off("initialized", onInit); };
  }, [i18n]);

  const changeLanguage = useCallback(async (code: LangCode) => {
    await applyLanguage(code);
  }, []);

  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? "tr") as LangCode;

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage:    currentLang,
        supportedLanguages: SUPPORTED_LANGUAGES,
        changeLanguage,
        isLanguageReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
