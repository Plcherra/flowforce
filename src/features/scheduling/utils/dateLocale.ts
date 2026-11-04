import { de, enUS, es, fr, it, pt } from "date-fns/locale";
import type { Locale } from "date-fns";

const LOCALES: Record<string, Locale> = {
  en: enUS,
  es,
  pt,
  fr,
  it,
  de,
};

export function dateLocale(language: string | null | undefined): Locale {
  const code = (language ?? "en").toLowerCase().split("-")[0] ?? "en";
  return LOCALES[code] ?? enUS;
}
