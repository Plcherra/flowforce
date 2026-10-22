import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const REMINDER_CONTENT_TABLE = "reminders";
export const REMINDER_CONTENT_FIELD_PATHS = ["title", "description"] as const;

export type ReminderContentFieldPath = (typeof REMINDER_CONTENT_FIELD_PATHS)[number];

export interface ReminderContentTranslation {
  sourceLocale: AppLanguage;
  title: string;
  description: string | null;
}

export interface StoredReminderTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export function reminderContentTranslationFields(input: {
  title?: string | null;
  description?: string | null;
}): Array<{ fieldPath: ReminderContentFieldPath; text: string }> {
  const fields: Array<{ fieldPath: ReminderContentFieldPath; text: string }> = [];
  if (typeof input.title === "string" && input.title.trim()) {
    fields.push({ fieldPath: "title", text: input.title });
  }
  if (typeof input.description === "string" && input.description.trim()) {
    fields.push({ fieldPath: "description", text: input.description });
  }
  return fields;
}

export function reminderContentTouches(updates: {
  title?: unknown;
  description?: unknown;
}): boolean {
  return updates.title !== undefined || updates.description !== undefined;
}

export async function resolveReminderContentTranslation(
  reminder: { id: string; title?: string | null; description?: string | null },
  rows: StoredReminderTranslation[],
  viewerLocale: AppLanguage,
): Promise<{
  translation: ReminderContentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = rows.filter((row) => row.sourceId === reminder.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  const fields = reminderContentTranslationFields(reminder);
  if (!sourceLocale || fields.length === 0) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }

  let needsRequest = false;
  const translated: Record<ReminderContentFieldPath, string> = {
    title: reminder.title ?? "",
    description: reminder.description ?? "",
  };
  for (const field of fields) {
    const hash = await sha256Hex(field.text);
    const row = ownRows.find(
      (item) => item.fieldPath === field.fieldPath && item.locale === viewerLocale,
    );
    if (row && row.sourceHash === hash) {
      translated[field.fieldPath] = row.translatedText;
    } else {
      needsRequest = true;
    }
  }
  const hasTranslation = fields.some((field) => translated[field.fieldPath] !== field.text);
  return {
    translation: hasTranslation
      ? {
          sourceLocale,
          title: translated.title,
          description: reminder.description ? translated.description : null,
        }
      : null,
    needsRequest,
    sourceLocale,
  };
}

export async function reminderNotificationCopy(input: {
  title: string;
  description: string | null;
  viewerLocale: AppLanguage;
  rows: StoredReminderTranslation[];
}): Promise<{ title: string; description: string | null }> {
  const pick = async (fieldPath: ReminderContentFieldPath, text: string) => {
    const hash = await sha256Hex(text);
    const row = input.rows.find(
      (item) =>
        item.fieldPath === fieldPath &&
        item.locale === input.viewerLocale &&
        item.sourceHash === hash,
    );
    return row?.translatedText ?? text;
  };
  return {
    title: input.title.trim() ? await pick("title", input.title) : input.title,
    description:
      input.description && input.description.trim()
        ? await pick("description", input.description)
        : input.description,
  };
}
