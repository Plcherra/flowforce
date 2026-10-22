import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import { TASK_CONTENT_TABLE, taskContentTranslationFields } from "./taskContentFields";

export function scheduleTaskContentTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  title?: string | null;
  description?: string | null;
}) {
  const fields = taskContentTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: TASK_CONTENT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
