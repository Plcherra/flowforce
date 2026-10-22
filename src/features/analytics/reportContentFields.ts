import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const CUSTOM_REPORT_TABLE = "custom_reports";
export const EMPLOYEE_REPORT_TABLE = "employee_report";

export interface ReportContentTranslation {
  sourceLocale: AppLanguage;
  name: string;
  description: string | null;
}

export interface EmployeeNoteTranslation {
  sourceLocale: AppLanguage;
  notes: string;
}

export interface StoredReportTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export function customReportTranslationFields(input: {
  name?: string | null;
  description?: string | null;
}): Array<{ fieldPath: "name" | "description"; text: string }> {
  const fields: Array<{ fieldPath: "name" | "description"; text: string }> = [];
  if (typeof input.name === "string" && input.name.trim()) {
    fields.push({ fieldPath: "name", text: input.name });
  }
  if (typeof input.description === "string" && input.description.trim()) {
    fields.push({ fieldPath: "description", text: input.description });
  }
  return fields;
}

export function employeeReportTranslationFields(input: {
  notes?: string | null;
}): Array<{ fieldPath: "notes"; text: string }> {
  if (typeof input.notes === "string" && input.notes.trim()) {
    return [{ fieldPath: "notes", text: input.notes }];
  }
  return [];
}

async function resolveField(input: {
  id: string;
  fieldPath: string;
  text: string;
  rows: StoredReportTranslation[];
  viewerLocale: AppLanguage;
}): Promise<{
  sourceLocale: AppLanguage | null;
  text: string | null;
  needsRequest: boolean;
}> {
  const ownRows = input.rows.filter(
    (row) => row.sourceId === input.id && row.fieldPath === input.fieldPath,
  );
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  if (!sourceLocale || input.text.trim() === "") {
    return { sourceLocale, text: null, needsRequest: false };
  }
  if (sourceLocale === input.viewerLocale) {
    return { sourceLocale, text: null, needsRequest: false };
  }
  const hash = await sha256Hex(input.text);
  const row = ownRows.find((item) => item.locale === input.viewerLocale);
  if (row && row.sourceHash === hash) {
    return { sourceLocale, text: row.translatedText, needsRequest: false };
  }
  return { sourceLocale, text: null, needsRequest: true };
}

export async function resolveCustomReportTranslation(
  report: { id: string; name?: string | null; description?: string | null },
  rows: StoredReportTranslation[],
  viewerLocale: AppLanguage,
): Promise<{
  translation: ReportContentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const name = await resolveField({
    id: report.id,
    fieldPath: "name",
    text: report.name ?? "",
    rows,
    viewerLocale,
  });
  const description = await resolveField({
    id: report.id,
    fieldPath: "description",
    text: report.description ?? "",
    rows,
    viewerLocale,
  });
  const sourceLocale = name.sourceLocale ?? description.sourceLocale;
  const needsRequest = name.needsRequest || description.needsRequest;
  if (!name.text && !description.text) {
    return { translation: null, needsRequest, sourceLocale };
  }
  return {
    translation: {
      sourceLocale: sourceLocale ?? viewerLocale,
      name: name.text ?? report.name ?? "",
      description: report.description ? description.text ?? report.description : null,
    },
    needsRequest,
    sourceLocale,
  };
}

export async function resolveEmployeeNoteTranslation(
  report: { id: string; notes?: string | null },
  rows: StoredReportTranslation[],
  viewerLocale: AppLanguage,
): Promise<{
  translation: EmployeeNoteTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const notes = await resolveField({
    id: report.id,
    fieldPath: "notes",
    text: report.notes ?? "",
    rows,
    viewerLocale,
  });
  if (!notes.text || !notes.sourceLocale) {
    return { translation: null, needsRequest: notes.needsRequest, sourceLocale: notes.sourceLocale };
  }
  return {
    translation: { sourceLocale: notes.sourceLocale, notes: notes.text },
    needsRequest: notes.needsRequest,
    sourceLocale: notes.sourceLocale,
  };
}
