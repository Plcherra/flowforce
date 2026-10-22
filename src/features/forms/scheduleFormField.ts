import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import {
  FORM_FIELD_TABLE,
  FORM_FIELD_TRANSLATION_BATCH,
  formFieldTranslationFields,
} from "./formFieldContent";

export function scheduleFormFieldTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  label?: string | null;
  description?: string | null;
  placeholder?: string | null;
  options?: unknown;
}) {
  const fields = formFieldTranslationFields(input);
  for (let index = 0; index < fields.length; index += FORM_FIELD_TRANSLATION_BATCH) {
    const batch = fields.slice(index, index + FORM_FIELD_TRANSLATION_BATCH);
    if (batch.length === 0) continue;
    void requestContentTranslation({
      companyId: input.companyId,
      sourceTable: FORM_FIELD_TABLE,
      sourceId: input.sourceId,
      sourceLocale: input.sourceLocale,
      viewerLocale: input.sourceLocale,
      fields: batch,
    }).catch(() => undefined);
  }
}
