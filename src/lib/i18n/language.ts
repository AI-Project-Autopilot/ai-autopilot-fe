export type Language = "ko" | "en";

export const DEFAULT_LANGUAGE: Language = "ko";
export const LANGUAGE_STORAGE_KEY = "autopilot-language";

export function isLanguage(value: unknown): value is Language {
  return value === "ko" || value === "en";
}

export function getLocale(language: Language): "ko-KR" | "en-US" {
  return language === "en" ? "en-US" : "ko-KR";
}
