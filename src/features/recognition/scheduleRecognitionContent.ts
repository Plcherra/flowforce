import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import {
  EMPLOYEE_BADGE_TABLE,
  RECOGNITION_EVENT_TABLE,
  badgeReasonFields,
  recognitionMessageFields,
} from "./recognitionContent";

export function scheduleRecognitionMessage(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  message?: string | null;
}) {
  const fields = recognitionMessageFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: RECOGNITION_EVENT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}

export function scheduleBadgeReason(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  reason?: string | null;
}) {
  const fields = badgeReasonFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: EMPLOYEE_BADGE_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
