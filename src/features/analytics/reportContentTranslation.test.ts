import assert from "node:assert/strict";

import {
  sourceHash,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { translatableFieldRule } from "@/server/i18n/translatableFields";

import {
  CUSTOM_REPORT_TABLE,
  EMPLOYEE_REPORT_TABLE,
  customReportTranslationFields,
  employeeReportTranslationFields,
  resolveCustomReportTranslation,
  resolveEmployeeNoteTranslation,
} from "./reportContentFields";
import { translateReportFields } from "./translateReportContent";

const reportName = "Weekly labor";
const reportDescription = "Hours by station for the week.";
const employeeNote = "Pedro covered the line on Friday.";
const amount = "128.40";
const columnId = "hours";

function fieldCache() {
  const store = new Map<string, ContentTranslationRow[]>();
  const cache: ContentTranslationCache = {
    async read(input) {
      return store.get(`${input.sourceTable}:${input.fieldPath}`) ?? [];
    },
    async replace(input) {
      store.set(
        `${input.sourceTable}:${input.fieldPath}`,
        input.rows.map((row) => ({
          locale: row.locale,
          sourceHash: input.sourceHash,
          translatedText: row.translatedText,
        })),
      );
    },
  };
  return {
    cache,
    rows: (sourceTable: string, fieldPath: string) =>
      store.get(`${sourceTable}:${fieldPath}`) ?? [],
  };
}

export async function runReportContentTranslationTests() {
  assert.deepEqual(translatableFieldRule(CUSTOM_REPORT_TABLE, "name"), {});
  assert.deepEqual(translatableFieldRule(CUSTOM_REPORT_TABLE, "description"), {});
  assert.equal(translatableFieldRule(CUSTOM_REPORT_TABLE, "filters"), null);
  assert.equal(translatableFieldRule(CUSTOM_REPORT_TABLE, "columns"), null);
  assert.deepEqual(translatableFieldRule(EMPLOYEE_REPORT_TABLE, "notes"), {});
  assert.equal(translatableFieldRule(EMPLOYEE_REPORT_TABLE, "severity"), null);

  const customFields = customReportTranslationFields({
    name: reportName,
    description: reportDescription,
  });
  assert.deepEqual(
    customFields.map((field) => field.fieldPath),
    ["name", "description"],
  );
  const noteFields = employeeReportTranslationFields({ notes: employeeNote });
  assert.deepEqual(noteFields, [{ fieldPath: "notes", text: employeeNote }]);
  assert.equal(
    customFields.some((field) => field.text === amount || field.text === columnId),
    false,
  );
  assert.equal(employeeReportTranslationFields({ notes: "" }).length, 0);

  const stored = fieldCache();
  const seen: string[] = [];
  const model = {
    async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
      seen.push(text);
      return { text: `${targetLocale}:${text}` };
    },
  };
  const budget = { async allowed() { return true; } };
  const shared = {
    companyId: "company-1",
    sourceLocale: "en" as const,
    viewerLocale: "es" as const,
    cache: stored.cache,
    model,
    budget,
  };
  const custom = await translateReportFields({
    ...shared,
    sourceTable: CUSTOM_REPORT_TABLE,
    sourceId: "report-1",
    fields: customFields,
  });
  const notes = await translateReportFields({
    ...shared,
    sourceTable: EMPLOYEE_REPORT_TABLE,
    sourceId: "note-1",
    fields: noteFields,
  });
  assert.deepEqual(custom, [`es:${reportName}`, `es:${reportDescription}`]);
  assert.deepEqual(notes, [`es:${employeeNote}`]);
  assert.equal(seen.length, 15);
  assert.equal(seen.includes(amount), false);
  assert.equal(seen.includes(columnId), false);
  assert.equal(seen.includes("4"), false);
  assert.equal(
    stored.rows(CUSTOM_REPORT_TABLE, "name").every((row) => row.sourceHash === sourceHash(reportName)),
    true,
  );

  const customRows = ["name", "description"].flatMap((fieldPath) =>
    stored.rows(CUSTOM_REPORT_TABLE, fieldPath).map((row) => ({
      sourceId: "report-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveCustomReportTranslation(
    { id: "report-1", name: reportName, description: reportDescription },
    customRows,
    "es",
  );
  assert.equal(resolved.translation?.name, `es:${reportName}`);
  assert.equal(resolved.translation?.description, `es:${reportDescription}`);

  const noteRows = stored.rows(EMPLOYEE_REPORT_TABLE, "notes").map((row) => ({
    sourceId: "note-1",
    fieldPath: "notes",
    locale: row.locale,
    sourceLocale: "en",
    sourceHash: row.sourceHash,
    translatedText: row.translatedText,
  }));
  const note = await resolveEmployeeNoteTranslation(
    { id: "note-1", notes: employeeNote },
    noteRows,
    "es",
  );
  assert.equal(note.translation?.notes, `es:${employeeNote}`);
  const author = await resolveEmployeeNoteTranslation(
    { id: "note-1", notes: employeeNote },
    noteRows,
    "en",
  );
  assert.equal(author.translation, null);
}
