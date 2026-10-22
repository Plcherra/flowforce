import type { AppLanguage } from "@/i18n/resolveLanguage";
import { RICH_HTML_INSTRUCTION, sameHtmlTags } from "@/server/i18n/richContent";
import {
  translateContent,
  type ContentBudgetGate,
  type ContentModelClient,
  type ContentTranslationCache,
  type ContentUsageEvent,
} from "@/server/i18n/translateContent";

import type { CompanyUpdateContentTranslation } from "./companyUpdateFields";

export async function translateCompanyUpdateFields(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  title: string;
  body: string;
  richContent?: string | null;
  cache: ContentTranslationCache;
  model: ContentModelClient;
  budget: ContentBudgetGate;
  recordUsage?: (event: ContentUsageEvent) => Promise<void>;
}): Promise<CompanyUpdateContentTranslation> {
  const shared = {
    companyId: input.companyId,
    sourceTable: "company_updates",
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
  const body = await translateContent({
    ...shared,
    fieldPath: "body",
    text: input.body,
  });
  const richSource = input.richContent ?? "";
  let richContent = input.richContent ?? null;
  if (richSource.trim()) {
    const rich = await translateContent({
      ...shared,
      fieldPath: "rich_content",
      text: richSource,
      instruction: RICH_HTML_INSTRUCTION,
      acceptTranslation: (translated) => sameHtmlTags(richSource, translated),
    });
    richContent = rich.text;
  }
  return {
    sourceLocale: input.sourceLocale,
    title: title.text,
    body: body.text,
    richContent,
  };
}
