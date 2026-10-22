import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import type { WrittenField } from "./remainingWrittenText";

export function scheduleWrittenText(input: {
  table: string;
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  fields: WrittenField[];
}) {
  if (input.fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: input.table,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields: input.fields,
  }).catch(() => undefined);
}
