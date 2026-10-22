import type { AppLanguage } from "@/i18n/resolveLanguage";
import {
  translateContent,
  type ContentBudgetGate,
  type ContentModelClient,
  type ContentTranslationCache,
  type ContentUsageEvent,
} from "@/server/i18n/translateContent";

import {
  FORM_CONTENT_TABLE,
  type FormContentTranslation,
} from "./formContentFields";

export async function translateFormFields(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  title: string;
  description?: string | null;
  cache: ContentTranslationCache;
  model: ContentModelClient;
  budget: ContentBudgetGate;
  recordUsage?: (event: ContentUsageEvent) => Promise<void>;
}): Promise<FormContentTranslation> {
  const shared = {
    companyId: input.companyId,
    sourceTable: FORM_CONTENT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.viewerLocale,
    cache: input.cache,
    model: input.model,
    budget: input.budget,
    recordUsage: input.recordUsage,
  };
  const title = await translateContent({
    ...shared,
    fieldPath: "title",
    text: input.title,
  });
  let description = input.description ?? null;
  if (typeof description === "string" && description.trim()) {
    const translated = await translateContent({
      ...shared,
      fieldPath: "description",
      text: description,
    });
    description = translated.text;
  }
  return {
    sourceLocale: input.sourceLocale,
    title: title.text,
    description,
  };
}
