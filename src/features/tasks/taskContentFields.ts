import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const TASK_CONTENT_TABLE = "tasks";
export const TASK_CONTENT_FIELD_PATHS = ["title", "description"] as const;

export type TaskContentFieldPath = (typeof TASK_CONTENT_FIELD_PATHS)[number];

export interface TaskContentTranslation {
  sourceLocale: AppLanguage;
  title: string;
  description: string | null;
}

export interface StoredTaskTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

const CONTENT_SOURCE_LOCALE = "contentSourceLocale";

export function readTaskSourceLocale(links: unknown): AppLanguage | null {
  if (!links || typeof links !== "object" || Array.isArray(links)) return null;
  const code = (links as Record<string, unknown>)[CONTENT_SOURCE_LOCALE];
  return isAppLanguage(code) ? code : null;
}

export function withTaskSourceLocale(links: unknown, sourceLocale: AppLanguage): unknown {
  if (Array.isArray(links)) return links;
  const base =
    links && typeof links === "object" ? { ...(links as Record<string, unknown>) } : {};
  base[CONTENT_SOURCE_LOCALE] = sourceLocale;
  return base;
}

export function taskContentTranslationFields(input: {
  title?: string | null;
  description?: string | null;
}): Array<{ fieldPath: TaskContentFieldPath; text: string }> {
  const fields: Array<{ fieldPath: TaskContentFieldPath; text: string }> = [];
  if (typeof input.title === "string" && input.title.trim()) {
    fields.push({ fieldPath: "title", text: input.title });
  }
  if (typeof input.description === "string" && input.description.trim()) {
    fields.push({ fieldPath: "description", text: input.description });
  }
  return fields;
}

export function taskContentTouches(updates: {
  title?: unknown;
  description?: unknown;
}): boolean {
  return updates.title !== undefined || updates.description !== undefined;
}

export async function resolveTaskContentTranslation(
  task: {
    id: string;
    title?: string | null;
    description?: string | null;
    links?: unknown;
  },
  rows: StoredTaskTranslation[],
  viewerLocale: AppLanguage,
): Promise<{
  translation: TaskContentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = rows.filter((row) => row.sourceId === task.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale =
    readTaskSourceLocale(task.links) ?? (isAppLanguage(cachedSource) ? cachedSource : null);
  const fields = taskContentTranslationFields(task);
  if (!sourceLocale || fields.length === 0) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }

  let needsRequest = false;
  const translated: Record<TaskContentFieldPath, string> = {
    title: task.title ?? "",
    description: task.description ?? "",
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
  const hasTranslation = fields.some((field) => {
    const row = ownRows.find(
      (item) => item.fieldPath === field.fieldPath && item.locale === viewerLocale,
    );
    return Boolean(row && translated[field.fieldPath] === row.translatedText);
  });
  return {
    translation: hasTranslation
      ? {
          sourceLocale,
          title: translated.title,
          description: task.description ? translated.description : null,
        }
      : null,
    needsRequest,
    sourceLocale,
  };
}
