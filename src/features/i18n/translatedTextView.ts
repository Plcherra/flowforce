import { languages } from "@/i18n/languages";
import type { AppLanguage } from "@/i18n/resolveLanguage";

export interface TranslatedTextView {
  body: string;
  control: string | null;
}

export function languageName(locale: AppLanguage): string {
  return languages.find((language) => language.code === locale)?.name ?? locale;
}

export function translatedTextView(input: {
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  original: string;
  translated: string;
  showingOriginal: boolean;
  translatedFrom: string;
  seeTranslation: string;
}): TranslatedTextView {
  if (input.viewerLocale === input.sourceLocale) {
    return { body: input.original, control: null };
  }
  if (input.showingOriginal) {
    return { body: input.original, control: input.seeTranslation };
  }
  return { body: input.translated, control: input.translatedFrom };
}
