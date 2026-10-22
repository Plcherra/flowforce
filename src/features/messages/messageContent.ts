import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const MESSAGE_TABLE = "messages";
export const MESSAGE_FIELD_PATH = "content";

export interface MessageTranslation {
  sourceLocale: AppLanguage;
  content: string;
}

export interface StoredMessageTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export async function resolveMessageTranslation(input: {
  id: string;
  content: string;
  rows: StoredMessageTranslation[];
  viewerLocale: AppLanguage;
}): Promise<{
  translation: MessageTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = input.rows.filter(
    (row) => row.sourceId === input.id && row.fieldPath === MESSAGE_FIELD_PATH,
  );
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
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
