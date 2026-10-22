import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import {
  SCHEDULE_TEXT_TABLE,
  TIME_OFF_TEXT_TABLE,
  shiftTranslationFields,
  timeOffTranslationFields,
} from "./scheduleTextFields";

export function scheduleShiftTextTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  title?: string | null;
  notes?: string | null;
}) {
  const fields = shiftTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: SCHEDULE_TEXT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}

export function scheduleTimeOffTextTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  reason?: string | null;
  notes?: string | null;
}) {
  const fields = timeOffTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: TIME_OFF_TEXT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
