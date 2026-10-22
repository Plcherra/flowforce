import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { languageName, translatedTextView } from "@/features/i18n/translatedTextView";
import type { FormContentTranslation } from "@/features/forms/formContentFields";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";

export function useFormContentDisplay(input: {
  recordId?: string;
  title: string;
  description?: string | null;
  translation: FormContentTranslation | null;
}) {
  const { t, i18n } = useTranslation();
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const source = input.translation?.sourceLocale ?? viewerLocale;
  const [showingOriginal, setShowingOriginal] = useState(false);

  useEffect(() => {
    setShowingOriginal(false);
  }, [input.recordId]);

  const shared = {
    sourceLocale: source,
    viewerLocale,
    showingOriginal,
    translatedFrom: t("i18n.translatedFrom", { language: languageName(source) }),
    seeTranslation: t("i18n.seeTranslation"),
  };
  const titleView = translatedTextView({
    ...shared,
    original: input.title,
    translated: input.translation?.title ?? input.title,
  });
  const descriptionView = input.description
    ? translatedTextView({
        ...shared,
        original: input.description,
        translated: input.translation?.description ?? input.description,
      })
    : null;

  return {
    title: titleView.body,
    description: descriptionView?.body ?? null,
    control: titleView.control ?? descriptionView?.control ?? null,
    toggle: () => setShowingOriginal((current) => !current),
  };
}

export function FormListTitle({
  formId,
  title,
  translation,
}: {
  formId: string;
  title: string;
  translation: FormContentTranslation | null;
}) {
  const display = useFormContentDisplay({
    recordId: formId,
    title,
    translation,
  });

  return (
    <div
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) {
          event.stopPropagation();
        }
      }}
    >
      <div className="font-medium">{display.title}</div>
      {display.control ? (
        <button
          type="button"
          className="mt-1 text-left text-xs text-muted-foreground underline"
          onClick={display.toggle}
        >
          {display.control}
        </button>
      ) : null}
    </div>
  );
}
