"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "@/i18n/resolveLanguage";
import {
  languageName,
  translatedTextView,
  type TranslatedTextView,
} from "@/features/i18n/translatedTextView";

export { languageName, translatedTextView };
export type { TranslatedTextView };

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
