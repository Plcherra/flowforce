import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";
import { translatedTextView } from "@/features/i18n/translatedTextView";

import type { StoredContentTranslation } from "./companyUpdateFields";

export const COMPANY_UPDATE_COMMENT_FIELD_PATH = "content";
export const COMPANY_UPDATE_COMMENT_TABLE = "company_update_comments";

export interface CommentContentTranslation {
  sourceLocale: AppLanguage;
  content: string;
}

export async function resolveCommentTranslation(input: {
  id: string;
  content: string;
  rows: StoredContentTranslation[];
  viewerLocale: AppLanguage;
}): Promise<{
  translation: CommentContentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = input.rows.filter(
    (row) =>
      row.sourceId === input.id &&
      row.fieldPath === COMPANY_UPDATE_COMMENT_FIELD_PATH,
  );
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))
    ?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  if (!sourceLocale || input.content.trim() === "") {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === input.viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  const hash = await sha256Hex(input.content);
  const row = ownRows.find((item) => item.locale === input.viewerLocale);
  if (row && row.sourceHash === hash) {
    return {
      translation: { sourceLocale, content: row.translatedText },
      needsRequest: false,
      sourceLocale,
    };
  }
  return { translation: null, needsRequest: true, sourceLocale };
}

export function commentTranslationForViewer(input: {
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  original: string;
  translated: string;
  showingOriginal: boolean;
  translatedFrom: string;
  seeTranslation: string;
}) {
  return translatedTextView(input);
}
