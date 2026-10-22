import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const SCHEDULE_TEXT_TABLE = "schedules";
export const TIME_OFF_TEXT_TABLE = "time_off_requests";

export interface ScheduleTextTranslation {
  sourceLocale: AppLanguage;
  title: string;
  notes: string | null;
}

export interface TimeOffTextTranslation {
  sourceLocale: AppLanguage;
  reason: string | null;
  notes: string | null;
}

export interface StoredScheduleText {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

function prose(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function shiftTranslationFields(input: {
  title?: string | null;
  notes?: string | null;
}): Array<{ fieldPath: "title" | "notes"; text: string }> {
  const fields: Array<{ fieldPath: "title" | "notes"; text: string }> = [];
  const title = prose(input.title);
  const notes = prose(input.notes);
  if (title) fields.push({ fieldPath: "title", text: title });
  if (notes) fields.push({ fieldPath: "notes", text: notes });
  return fields;
}

export function timeOffTranslationFields(input: {
  reason?: string | null;
  notes?: string | null;
}): Array<{ fieldPath: "reason" | "notes"; text: string }> {
  const fields: Array<{ fieldPath: "reason" | "notes"; text: string }> = [];
  const reason = prose(input.reason);
  const notes = prose(input.notes);
  if (reason) fields.push({ fieldPath: "reason", text: reason });
  if (notes) fields.push({ fieldPath: "notes", text: notes });
  return fields;
}

async function translatedField(input: {
  id: string;
  fieldPath: string;
  text: string;
  rows: StoredScheduleText[];
  viewerLocale: AppLanguage;
}): Promise<{ sourceLocale: AppLanguage | null; text: string | null; needsRequest: boolean }> {
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

export async function resolveShiftText(
  shift: { id: string; title?: string | null; notes?: string | null },
  rows: StoredScheduleText[],
  viewerLocale: AppLanguage,
) {
  const title = await translatedField({
    id: shift.id,
    fieldPath: "title",
    text: shift.title ?? "",
    rows,
    viewerLocale,
  });
  const notes = await translatedField({
    id: shift.id,
    fieldPath: "notes",
    text: shift.notes ?? "",
    rows,
    viewerLocale,
  });
  const sourceLocale = title.sourceLocale ?? notes.sourceLocale;
  const needsRequest = title.needsRequest || notes.needsRequest;
  if (!title.text && !notes.text) {
    return { translation: null as ScheduleTextTranslation | null, needsRequest, sourceLocale };
  }
  return {
    translation: {
      sourceLocale: sourceLocale ?? viewerLocale,
      title: title.text ?? shift.title ?? "",
      notes: shift.notes ? notes.text ?? shift.notes : null,
    } satisfies ScheduleTextTranslation,
    needsRequest,
    sourceLocale,
  };
}

export async function resolveTimeOffText(
  request: { id: string; reason?: string | null; notes?: string | null },
  rows: StoredScheduleText[],
  viewerLocale: AppLanguage,
) {
  const reason = await translatedField({
    id: request.id,
    fieldPath: "reason",
    text: request.reason ?? "",
    rows,
    viewerLocale,
  });
  const notes = await translatedField({
    id: request.id,
    fieldPath: "notes",
    text: request.notes ?? "",
    rows,
    viewerLocale,
  });
  const sourceLocale = reason.sourceLocale ?? notes.sourceLocale;
  const needsRequest = reason.needsRequest || notes.needsRequest;
  if (!reason.text && !notes.text) {
    return { translation: null as TimeOffTextTranslation | null, needsRequest, sourceLocale };
  }
  return {
    translation: {
      sourceLocale: sourceLocale ?? viewerLocale,
      reason: request.reason ? reason.text ?? request.reason : null,
      notes: request.notes ? notes.text ?? request.notes : null,
    } satisfies TimeOffTextTranslation,
    needsRequest,
    sourceLocale,
  };
}
