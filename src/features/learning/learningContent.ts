import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const COURSE_TABLE = "learning_courses";
export const LEARNING_MODULE_TABLE = "learning_modules";
export const TRAINING_MODULE_TABLE = "training_modules";

export interface LearningTranslation {
  sourceLocale: AppLanguage;
  title: string;
  description: string | null;
}

export interface StoredLearningTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export function learningTextFields(input: {
  title?: string | null;
  description?: string | null;
}): Array<{ fieldPath: "title" | "description"; text: string }> {
  const fields: Array<{ fieldPath: "title" | "description"; text: string }> = [];
  if (typeof input.title === "string" && input.title.trim()) {
    fields.push({ fieldPath: "title", text: input.title });
  }
  if (typeof input.description === "string" && input.description.trim()) {
    fields.push({ fieldPath: "description", text: input.description });
  }
  return fields;
}

export async function resolveLearningTranslation(
  record: { id: string; title?: string | null; description?: string | null },
  rows: StoredLearningTranslation[],
  viewerLocale: AppLanguage,
) {
  const ownRows = rows.filter((row) => row.sourceId === record.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  const fields = learningTextFields(record);
  if (!sourceLocale || fields.length === 0 || sourceLocale === viewerLocale) {
    return { translation: null as LearningTranslation | null, needsRequest: false, sourceLocale };
  }
  let needsRequest = false;
  const translated = { title: record.title ?? "", description: record.description ?? "" };
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
      ? {
          sourceLocale,
          title: translated.title,
          description: record.description ? translated.description : null,
        }
      : null,
    needsRequest,
    sourceLocale,
  };
}
