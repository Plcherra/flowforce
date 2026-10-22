import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const TASK_COMMENT_TABLE = "task_comments";
export const TASK_COMMENT_FIELD_PATH = "comment";

export interface TaskCommentTranslation {
  sourceLocale: AppLanguage;
  comment: string;
}

export interface StoredTaskCommentTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export async function resolveTaskCommentTranslation(input: {
  id: string;
  comment: string;
  rows: StoredTaskCommentTranslation[];
  viewerLocale: AppLanguage;
}): Promise<{
  translation: TaskCommentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = input.rows.filter(
    (row) => row.sourceId === input.id && row.fieldPath === TASK_COMMENT_FIELD_PATH,
  );
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  if (!sourceLocale || input.comment.trim() === "") {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === input.viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  const hash = await sha256Hex(input.comment);
  const row = ownRows.find((item) => item.locale === input.viewerLocale);
  if (row && row.sourceHash === hash) {
    return {
      translation: { sourceLocale, comment: row.translatedText },
      needsRequest: false,
      sourceLocale,
    };
  }
  return { translation: null, needsRequest: true, sourceLocale };
}
