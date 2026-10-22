"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { languageName, translatedTextView } from "@/features/i18n/translatedTextView";
import { appLanguageFromTag, type AppLanguage } from "@/i18n/resolveLanguage";

export interface TranslatedRecordField {
  id: string;
  original: string;
  translated: string;
  className?: string;
  html?: boolean;
  as?: "h2" | "h3" | "p" | "div";
}

export function TranslatedRecord({
  sourceLocale,
  fields,
}: {
  sourceLocale: AppLanguage | null;
  fields: TranslatedRecordField[];
}) {
  const { t, i18n } = useTranslation();
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const source = sourceLocale ?? viewerLocale;
  const [showingOriginal, setShowingOriginal] = useState(false);
  const views = fields.map((field) => ({
    field,
    view: translatedTextView({
      sourceLocale: source,
      viewerLocale,
      original: field.original,
      translated: field.translated,
      showingOriginal,
      translatedFrom: t("i18n.translatedFrom", {
        language: languageName(source),
      }),
      seeTranslation: t("i18n.seeTranslation"),
    }),
  }));
  const control = views.find((item) => item.view.control)?.view.control ?? null;

  return (
    <div>
      {views.map(({ field, view }) => {
        if (field.html) {
          return (
            <div
              key={field.id}
              className={field.className}
              dangerouslySetInnerHTML={{ __html: view.body }}
            />
          );
        }
        if (field.as === "h2") {
          return (
            <h2 key={field.id} className={field.className}>
              {view.body}
            </h2>
          );
        }
        if (field.as === "h3") {
          return (
            <h3 key={field.id} className={field.className}>
              {view.body}
            </h3>
          );
        }
        if (field.as === "div") {
          return (
            <div key={field.id} className={field.className}>
              {view.body}
            </div>
          );
        }
        return (
          <p key={field.id} className={field.className}>
            {view.body}
          </p>
        );
      })}
      {control ? (
        <button
          type="button"
          className="mt-2 text-left text-xs text-muted-foreground underline"
          onClick={() => setShowingOriginal((current) => !current)}
        >
          {control}
        </button>
      ) : null}
    </div>
  );
}
