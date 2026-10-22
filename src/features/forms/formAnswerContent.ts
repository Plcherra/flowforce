import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

import type { StoredFormTranslation } from "./formContentFields";

export const FORM_SUBMISSION_TABLE = "form_submissions";

const PROSE_FIELD_TYPES = new Set(["text", "textarea"]);

export interface FormAnswerField {
  id: string;
  field_type?: string | null;
}

export interface FormAnswerTranslation {
  sourceLocale: AppLanguage;
  answers: Record<string, string>;
}

export function submissionAnswerFieldPath(fieldId: string): string {
  return `submission_data.${fieldId}`;
}

export function isSubmissionAnswerPath(fieldPath: string): boolean {
  return /^submission_data\.[A-Za-z0-9_-]+$/.test(fieldPath);
}

export function proseAnswers(input: {
  submissionData: Record<string, unknown>;
  fields: FormAnswerField[];
}): Array<{ fieldId: string; fieldPath: string; text: string }> {
  const typeById = new Map(input.fields.map((field) => [field.id, field.field_type ?? ""]));
  const answers: Array<{ fieldId: string; fieldPath: string; text: string }> = [];
  for (const [fieldId, value] of Object.entries(input.submissionData)) {
    if (typeof value !== "string" || value.trim() === "") continue;
    const fieldType = typeById.get(fieldId);
    const prose =
      fieldId === "additional_information" || PROSE_FIELD_TYPES.has(fieldType ?? "");
    if (!prose) continue;
    answers.push({
      fieldId,
      fieldPath: submissionAnswerFieldPath(fieldId),
      text: value,
    });
  }
  return answers;
}

export async function resolveSubmissionAnswers(input: {
  id: string;
  submissionData: Record<string, unknown>;
  fields: FormAnswerField[];
  rows: StoredFormTranslation[];
  viewerLocale: AppLanguage;
}): Promise<{
  translation: FormAnswerTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const answers = proseAnswers(input);
  const ownRows = input.rows.filter((row) => row.sourceId === input.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  if (!sourceLocale || answers.length === 0) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === input.viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }

  let needsRequest = false;
  const translated: Record<string, string> = {};
  for (const answer of answers) {
    const hash = await sha256Hex(answer.text);
    const row = ownRows.find(
      (item) => item.fieldPath === answer.fieldPath && item.locale === input.viewerLocale,
    );
    if (row && row.sourceHash === hash) {
      translated[answer.fieldId] = row.translatedText;
    } else {
      needsRequest = true;
    }
  }
  const hasTranslation = Object.keys(translated).length > 0;
  return {
    translation: hasTranslation
      ? { sourceLocale, answers: translated }
      : null,
    needsRequest,
    sourceLocale,
  };
}
