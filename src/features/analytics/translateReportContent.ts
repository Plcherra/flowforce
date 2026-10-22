import type { AppLanguage } from "@/i18n/resolveLanguage";
import {
  translateContent,
  type ContentBudgetGate,
  type ContentModelClient,
  type ContentTranslationCache,
  type ContentUsageEvent,
} from "@/server/i18n/translateContent";

export async function translateReportFields(input: {
  companyId: string;
  sourceTable: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  fields: Array<{ fieldPath: string; text: string }>;
  cache: ContentTranslationCache;
  model: ContentModelClient;
  budget: ContentBudgetGate;
  recordUsage?: (event: ContentUsageEvent) => Promise<void>;
}): Promise<string[]> {
  const translated: string[] = [];
  for (const field of input.fields) {
    const result = await translateContent({
      companyId: input.companyId,
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
      sourceLocale: input.sourceLocale,
      viewerLocale: input.viewerLocale,
      fieldPath: field.fieldPath,
      text: field.text,
      cache: input.cache,
      model: input.model,
      budget: input.budget,
      recordUsage: input.recordUsage,
    });
    translated.push(result.text);
  }
  return translated;
}
