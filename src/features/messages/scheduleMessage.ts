import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import { MESSAGE_FIELD_PATH, MESSAGE_TABLE } from "./messageContent";

export function scheduleMessageTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  content: string;
}) {
  if (!input.content.trim()) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: MESSAGE_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields: [{ fieldPath: MESSAGE_FIELD_PATH, text: input.content }],
  }).catch(() => undefined);
}
