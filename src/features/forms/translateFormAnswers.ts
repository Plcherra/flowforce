import type { AppLanguage } from "@/i18n/resolveLanguage";
import {
  translateContent,
  type ContentBudgetGate,
  type ContentModelClient,
  type ContentTranslationCache,
  type ContentUsageEvent,
} from "@/server/i18n/translateContent";

import {
  FORM_SUBMISSION_TABLE,
  proseAnswers,
  type FormAnswerField,
  type FormAnswerTranslation,
} from "./formAnswerContent";

export async function translateFormAnswers(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  submissionData: Record<string, unknown>;
  fields: FormAnswerField[];
  cache: ContentTranslationCache;
  model: ContentModelClient;
  budget: ContentBudgetGate;
  recordUsage?: (event: ContentUsageEvent) => Promise<void>;
}): Promise<{
  translation: FormAnswerTranslation;
  sentFieldPaths: string[];
}> {
  const answers = proseAnswers(input);
  const translated: Record<string, string> = {};
  for (const answer of answers) {
    const result = await translateContent({
      companyId: input.companyId,
      sourceTable: FORM_SUBMISSION_TABLE,
      sourceId: input.sourceId,
      fieldPath: answer.fieldPath,
      sourceLocale: input.sourceLocale,
      viewerLocale: input.viewerLocale,
      text: answer.text,
      cache: input.cache,
      model: input.model,
      budget: input.budget,
      recordUsage: input.recordUsage,
    });
    translated[answer.fieldId] = result.text;
  }
  return {
    translation: { sourceLocale: input.sourceLocale, answers: translated },
    sentFieldPaths: answers.map((answer) => answer.fieldPath),
  };
}
