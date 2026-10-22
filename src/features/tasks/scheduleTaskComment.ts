import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { AppLanguage } from "@/i18n/resolveLanguage";

import { TASK_COMMENT_FIELD_PATH, TASK_COMMENT_TABLE } from "./taskCommentContent";

export function scheduleTaskCommentTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  comment: string;
}) {
  if (!input.comment.trim()) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: TASK_COMMENT_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields: [{ fieldPath: TASK_COMMENT_FIELD_PATH, text: input.comment }],
  }).catch(() => undefined);
}
