import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import { learningTextFields } from "./learningContent";

export function scheduleLearningTranslation(input: {
  table: string;
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  title?: string | null;
  description?: string | null;
}) {
  const fields = learningTextFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: input.table,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
