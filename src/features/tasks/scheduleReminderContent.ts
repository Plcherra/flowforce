import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import {
  REMINDER_CONTENT_TABLE,
  reminderContentTranslationFields,
} from "./reminderContentFields";

export function scheduleReminderContentTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  title?: string | null;
  description?: string | null;
}) {
  const fields = reminderContentTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: REMINDER_CONTENT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
