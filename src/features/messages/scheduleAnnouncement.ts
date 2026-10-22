import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import {
  ANNOUNCEMENT_TABLE,
  announcementTranslationFields,
} from "./announcementContent";

export function scheduleAnnouncementTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  title?: string | null;
  content?: string | null;
}) {
  const fields = announcementTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: ANNOUNCEMENT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}
