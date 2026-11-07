import type { i18n as I18nInstance } from "i18next";
import {
  persistLanguage,
  type LanguageSource,
} from "./languagePreference";
import { isAppLanguage, type AppLanguage } from "./resolveLanguage";

export async function applyActiveLanguage(
  i18n: I18nInstance,
  language: AppLanguage,
  source: LanguageSource,
  options?: { persist?: boolean },
) {
  const current = (i18n.resolvedLanguage || i18n.language || "").toLowerCase().split("-")[0];
  if (current !== language) {
    await i18n.changeLanguage(language);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
  if (options?.persist !== false) {
    persistLanguage(language, source);
  }
}

export function activeLanguage(i18n: I18nInstance): AppLanguage {
  const code = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().split("-")[0];
  return isAppLanguage(code) ? code : "en";
}
