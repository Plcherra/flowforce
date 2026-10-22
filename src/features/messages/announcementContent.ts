import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const ANNOUNCEMENT_TABLE = "announcements";

export interface AnnouncementTranslation {
  sourceLocale: AppLanguage;
  title: string;
  content: string;
}

export interface StoredAnnouncementTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export function announcementTranslationFields(input: {
  title?: string | null;
  content?: string | null;
}): Array<{ fieldPath: "title" | "content"; text: string }> {
  const fields: Array<{ fieldPath: "title" | "content"; text: string }> = [];
  if (typeof input.title === "string" && input.title.trim()) {
    fields.push({ fieldPath: "title", text: input.title });
  }
  if (typeof input.content === "string" && input.content.trim()) {
    fields.push({ fieldPath: "content", text: input.content });
  }
  return fields;
}

export async function resolveAnnouncementTranslation(
  announcement: { id: string; title?: string | null; content?: string | null },
  rows: StoredAnnouncementTranslation[],
  viewerLocale: AppLanguage,
): Promise<{
  translation: AnnouncementTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = rows.filter((row) => row.sourceId === announcement.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  const fields = announcementTranslationFields(announcement);
  if (!sourceLocale || fields.length === 0) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  let needsRequest = false;
  const translated = { title: announcement.title ?? "", content: announcement.content ?? "" };
  for (const field of fields) {
    const hash = await sha256Hex(field.text);
    const row = ownRows.find(
      (item) => item.fieldPath === field.fieldPath && item.locale === viewerLocale,
    );
    if (row && row.sourceHash === hash) translated[field.fieldPath] = row.translatedText;
    else needsRequest = true;
  }
  const hasTranslation = fields.some((field) => translated[field.fieldPath] !== field.text);
  return {
    translation: hasTranslation
      ? { sourceLocale, title: translated.title, content: translated.content }
      : null,
    needsRequest,
    sourceLocale,
  };
}
