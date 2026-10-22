import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import {
  FORM_CONTENT_TABLE,
  formContentTranslationFields,
} from "./formContentFields";

export function scheduleFormContentTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  title?: string | null;
  description?: string | null;
}) {
  const fields = formContentTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: FORM_CONTENT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
