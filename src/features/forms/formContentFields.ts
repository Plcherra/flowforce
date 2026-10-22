import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const FORM_CONTENT_TABLE = "forms";

export const FORM_CONTENT_FIELD_PATHS = ["title", "description"] as const;

export type FormContentFieldPath = (typeof FORM_CONTENT_FIELD_PATHS)[number];

export interface FormContentTranslation {
  sourceLocale: AppLanguage;
  title: string;
  description: string | null;
}

export interface StoredFormTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

const CONTENT_SOURCE_LOCALE = "contentSourceLocale";

export function readFormSourceLocale(value: unknown): AppLanguage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const code = (value as Record<string, unknown>)[CONTENT_SOURCE_LOCALE];
  return isAppLanguage(code) ? code : null;
}

export function withFormSourceLocale(
  settings: unknown,
  sourceLocale: AppLanguage,
): Record<string, unknown> {
  const base =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  base[CONTENT_SOURCE_LOCALE] = sourceLocale;
  return base;
}

export function formContentTranslationFields(input: {
  title?: string | null;
  description?: string | null;
}): Array<{ fieldPath: FormContentFieldPath; text: string }> {
  const fields: Array<{ fieldPath: FormContentFieldPath; text: string }> = [];
  if (typeof input.title === "string" && input.title.trim()) {
    fields.push({ fieldPath: "title", text: input.title });
  }
  if (typeof input.description === "string" && input.description.trim()) {
    fields.push({ fieldPath: "description", text: input.description });
  }
  return fields;
}

export function formContentTouches(updates: {
  title?: unknown;
  description?: unknown;
}): boolean {
  return updates.title !== undefined || updates.description !== undefined;
}

export async function saveFormWithoutModel(input: {
  save: () => Promise<void>;
  translate?: () => Promise<unknown> | void;
}): Promise<void> {
  await input.save();
  if (!input.translate) return;
  const translate = input.translate;
  void Promise.resolve()
    .then(() => translate())
    .catch(() => undefined);
}

export async function resolveFormContentTranslation(
  form: {
    id: string;
    title: string;
    description?: string | null;
    settings?: unknown;
  },
  rows: StoredFormTranslation[],
  viewerLocale: AppLanguage,
): Promise<{
  translation: FormContentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = rows.filter((row) => row.sourceId === form.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))
    ?.sourceLocale;
  const sourceLocale =
    readFormSourceLocale(form.settings) ??
    (isAppLanguage(cachedSource) ? cachedSource : null);
  const fields = formContentTranslationFields({
    title: form.title,
    description: form.description,
  });
  if (!sourceLocale || fields.length === 0) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }

  let needsRequest = false;
  const translated: Record<FormContentFieldPath, string> = {
    title: form.title,
    description: form.description ?? "",
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
          description: form.description ? translated.description : null,
        }
      : null,
    needsRequest,
    sourceLocale,
  };
}
