import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const RECOGNITION_EVENT_TABLE = "recognition_events";
export const EMPLOYEE_BADGE_TABLE = "employee_badge";

export interface StoredRecognitionTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

export function recognitionMessageFields(input: {
  message?: string | null;
  personName?: string | null;
}): Array<{ fieldPath: "message"; text: string }> {
  if (typeof input.message === "string" && input.message.trim()) {
    return [{ fieldPath: "message", text: input.message }];
  }
  return [];
}

export function badgeReasonFields(input: {
  reason?: string | null;
  personName?: string | null;
}): Array<{ fieldPath: "reason"; text: string }> {
  if (typeof input.reason === "string" && input.reason.trim()) {
    return [{ fieldPath: "reason", text: input.reason }];
  }
  return [];
}

async function resolveField(
  recordId: string,
  fieldPath: "message" | "reason",
  text: string | null | undefined,
  rows: StoredRecognitionTranslation[],
  viewerLocale: AppLanguage,
) {
  const ownRows = rows.filter((row) => row.sourceId === recordId);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale = isAppLanguage(cachedSource) ? cachedSource : null;
  if (!sourceLocale || typeof text !== "string" || !text.trim() || sourceLocale === viewerLocale) {
    return { text: null as string | null, needsRequest: false, sourceLocale };
  }
  const hash = await sha256Hex(text);
  const row = ownRows.find(
    (item) => item.fieldPath === fieldPath && item.locale === viewerLocale,
  );
  if (row && row.sourceHash === hash) {
    return { text: row.translatedText, needsRequest: false, sourceLocale };
  }
  return { text: null, needsRequest: true, sourceLocale };
}

export function resolveRecognitionMessage(
  record: { id: string; message?: string | null },
  rows: StoredRecognitionTranslation[],
  viewerLocale: AppLanguage,
) {
  return resolveField(record.id, "message", record.message, rows, viewerLocale);
}

export function resolveBadgeReason(
  record: { id: string; reason?: string | null },
  rows: StoredRecognitionTranslation[],
  viewerLocale: AppLanguage,
) {
  return resolveField(record.id, "reason", record.reason, rows, viewerLocale);
}
