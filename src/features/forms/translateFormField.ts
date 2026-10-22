import type { AppLanguage } from "@/i18n/resolveLanguage";
import {
  translateContent,
  type ContentBudgetGate,
  type ContentModelClient,
  type ContentTranslationCache,
  type ContentUsageEvent,
} from "@/server/i18n/translateContent";

import {
  FORM_FIELD_TABLE,
  formFieldTranslationFields,
  optionLabelPath,
  readBuilderOptionLabels,
  type FormFieldContentTranslation,
} from "./formFieldContent";

export async function translateFormField(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  label: string;
  description?: string | null;
  placeholder?: string | null;
  options?: unknown;
  cache: ContentTranslationCache;
  model: ContentModelClient;
  budget: ContentBudgetGate;
  recordUsage?: (event: ContentUsageEvent) => Promise<void>;
}): Promise<FormFieldContentTranslation> {
  const shared = {
    companyId: input.companyId,
    sourceTable: FORM_FIELD_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.viewerLocale,
    cache: input.cache,
    model: input.model,
    budget: input.budget,
    recordUsage: input.recordUsage,
  };
  const translated = new Map<string, string>();
  for (const field of formFieldTranslationFields(input)) {
    const result = await translateContent({
      ...shared,
      fieldPath: field.fieldPath,
      text: field.text,
    });
    translated.set(field.fieldPath, result.text);
  }
  const options = readBuilderOptionLabels(input.options);
  return {
    sourceLocale: input.sourceLocale,
    label: translated.get("label") ?? input.label,
    description: input.description
      ? translated.get("description") ?? input.description
      : null,
    placeholder: input.placeholder
      ? translated.get("placeholder") ?? input.placeholder
      : null,
    optionLabels: options.map(
      (option, index) => translated.get(optionLabelPath(index)) ?? option,
    ),
  };
}
