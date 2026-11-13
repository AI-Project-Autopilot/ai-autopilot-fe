"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, getLocale, isLanguage, LANGUAGE_STORAGE_KEY, type Language } from "@/lib/i18n/language";

type LanguageContextValue = {
  language: Language;
  locale: "ko-KR" | "en-US";
  setLanguage: (language: Language) => void;
  t: (ko: string, en: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_CHANGE_EVENT = "autopilot-language-change";
let memoryLanguage: Language | null = null;

function getLanguageSnapshot(): Language {
  if (memoryLanguage) return memoryLanguage;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function getServerLanguageSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

function subscribeToLanguage(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) {
      memoryLanguage = null;
      onChange();
    }
  };
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function updateLanguage(language: Language) {
  if (!isLanguage(language)) return;
  memoryLanguage = language;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    memoryLanguage = null;
  } catch {
    // The current page still switches languages when persistence is unavailable.
  }
  window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot, getServerLanguageSnapshot);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: getLocale(language),
    setLanguage: updateLanguage,
    t: (ko, en) => language === "en" ? en : ko,
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage requires LanguageProvider");
  return value;
}
