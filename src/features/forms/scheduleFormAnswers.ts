import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import { FORM_FIELD_TRANSLATION_BATCH } from "./formFieldContent";
import {
  FORM_SUBMISSION_TABLE,
  proseAnswers,
  type FormAnswerField,
} from "./formAnswerContent";

export function scheduleFormAnswerTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  submissionData: Record<string, unknown>;
  fields: FormAnswerField[];
}) {
  const fields = proseAnswers(input).map((answer) => ({
    fieldPath: answer.fieldPath,
    text: answer.text,
  }));
  for (let index = 0; index < fields.length; index += FORM_FIELD_TRANSLATION_BATCH) {
    const batch = fields.slice(index, index + FORM_FIELD_TRANSLATION_BATCH);
    if (batch.length === 0) continue;
    void requestContentTranslation({
      companyId: input.companyId,
      sourceTable: FORM_SUBMISSION_TABLE,
      sourceId: input.sourceId,
      sourceLocale: input.sourceLocale,
      viewerLocale: input.sourceLocale,
      fields: batch,
    }).catch(() => undefined);
  }
}
