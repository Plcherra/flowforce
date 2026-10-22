import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

export const HELPDESK_TABLE = "helpdesk_tickets";
export const OPS_ISSUE_TABLE = "ops_issues";
export const EXPENSE_TABLE = "expenses";
export const VENDOR_VISIT_TABLE = "vendor_visits";

export interface WrittenField {
  fieldPath: string;
  text: string;
}

export interface StoredWrittenTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

function proseField(fieldPath: string, value: string | null | undefined): WrittenField | null {
  if (typeof value === "string" && value.trim()) return { fieldPath, text: value };
  return null;
}

export function helpdeskTextFields(input: {
  subject?: string | null;
  description?: string | null;
}): WrittenField[] {
  return [proseField("subject", input.subject), proseField("description", input.description)].filter(
    (field): field is WrittenField => Boolean(field),
  );
}

export function opsIssueTextFields(input: {
  title?: string | null;
  description?: string | null;
}): WrittenField[] {
  return [proseField("title", input.title), proseField("description", input.description)].filter(
    (field): field is WrittenField => Boolean(field),
  );
}

export function expenseTextFields(input: {
  description?: string | null;
  notes?: string | null;
  amount?: string | number | null;
  receiptUrl?: string | null;
}): WrittenField[] {
  return [proseField("description", input.description), proseField("notes", input.notes)].filter(
    (field): field is WrittenField => Boolean(field),
  );
}

export function vendorVisitTextFields(input: {
  description?: string | null;
  vendorName?: string | null;
  amount?: string | number | null;
  receiptUrl?: string | null;
}): WrittenField[] {
  const description = proseField("description", input.description);
  return description ? [description] : [];
}

export async function resolveWrittenText(
  record: {
    id: string;
    sourceLocale?: string | null;
    fields: WrittenField[];
  },
  rows: StoredWrittenTranslation[],
  viewerLocale: AppLanguage,
) {
  const ownRows = rows.filter((row) => row.sourceId === record.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const knownSource = isAppLanguage(record.sourceLocale) ? record.sourceLocale : null;
  const sourceLocale = knownSource ?? (isAppLanguage(cachedSource) ? cachedSource : null);
  if (!sourceLocale || record.fields.length === 0 || sourceLocale === viewerLocale) {
    return {
      values: {} as Record<string, string>,
      needsRequest: false,
      sourceLocale,
    };
  }
  let needsRequest = false;
  const values: Record<string, string> = {};
  for (const field of record.fields) {
    const hash = await sha256Hex(field.text);
    const row = ownRows.find(
      (item) => item.fieldPath === field.fieldPath && item.locale === viewerLocale,
    );
    if (row && row.sourceHash === hash) values[field.fieldPath] = row.translatedText;
    else needsRequest = true;
  }
  return { values, needsRequest, sourceLocale };
}
