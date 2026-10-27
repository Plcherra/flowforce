import { de, enUS, es, fr, it, pt } from "date-fns/locale";
import type { Locale } from "date-fns";

import { appLanguageFromTag } from "@/i18n/resolveLanguage";

const LOCALES: Record<string, Locale> = {
  en: enUS,
  es,
  pt,
  fr,
  it,
  de,
};

export function dateLocaleForLanguage(language: string | undefined): Locale {
  return LOCALES[appLanguageFromTag(language)] ?? enUS;
}
