import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";
import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";

export const GOAL_TABLE = "goals";

export interface GoalTranslation {
  sourceLocale: AppLanguage;
  title: string;
  description: string | null;
}

export interface StoredGoalTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export function goalTranslationFields(input: {
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

export function scheduleGoalTranslation(input: {
  companyId: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  title?: string | null;
  description?: string | null;
}) {
  const fields = goalTranslationFields(input);
  if (fields.length === 0) return;
  void requestContentTranslation({
    companyId: input.companyId,
    sourceTable: GOAL_TABLE,
    sourceId: input.sourceId,
    sourceLocale: input.sourceLocale,
    viewerLocale: input.sourceLocale,
    fields,
  }).catch(() => undefined);
}

export async function resolveGoalTranslation(
  goal: { id: string; title?: string | null; description?: string | null },
  rows: StoredGoalTranslation[],
  viewerLocale: AppLanguage,
) {
  const ownRows = rows.filter((row) => row.sourceId === goal.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  const fields = goalTranslationFields(goal);
  if (!sourceLocale || fields.length === 0 || sourceLocale === viewerLocale) {
    return { translation: null as GoalTranslation | null, needsRequest: false, sourceLocale };
  }
  let needsRequest = false;
  const translated = { title: goal.title ?? "", description: goal.description ?? "" };
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
          description: goal.description ? translated.description : null,
        }
      : null,
    needsRequest,
    sourceLocale,
  };
}
