"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

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

export function TranslatedText({
  sourceLocale,
  viewerLocale,
  original,
  translated,
}: {
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  original: string;
  translated: string;
}) {
  const { t } = useTranslation();
  const [showingOriginal, setShowingOriginal] = useState(false);
  const view = translatedTextView({
    sourceLocale,
    viewerLocale,
    original,
    translated,
    showingOriginal,
    translatedFrom: t("i18n.translatedFrom", { language: languageName(sourceLocale) }),
    seeTranslation: t("i18n.seeTranslation"),
  });

  return (
    <div>
      <p>{view.body}</p>
      {view.control ? (
        <button type="button" onClick={() => setShowingOriginal((current) => !current)}>
          {view.control}
        </button>
      ) : null}
    </div>
  );
}
