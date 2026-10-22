import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import {
  CUSTOM_REPORT_TABLE,
  EMPLOYEE_REPORT_TABLE,
  customReportTranslationFields,
  employeeReportTranslationFields,
} from "./reportContentFields";

export function scheduleCustomReportTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  name?: string | null;
  description?: string | null;
}) {
  const fields = customReportTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: CUSTOM_REPORT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}

export function scheduleEmployeeReportTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  notes?: string | null;
}) {
  const fields = employeeReportTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: EMPLOYEE_REPORT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
