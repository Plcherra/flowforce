import assert from "node:assert/strict";

import {
  sourceHash,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { translatableFieldRule } from "@/server/i18n/translatableFields";

import {
  SCHEDULE_TEXT_TABLE,
  TIME_OFF_TEXT_TABLE,
  resolveShiftText,
  resolveTimeOffText,
  shiftTranslationFields,
  timeOffTranslationFields,
} from "./scheduleTextFields";
import { translateScheduleFields } from "./translateScheduleText";

const shiftTitle = "Friday close";
const shiftNotes = "Lock the front door and check the walk-in.";
const timeOffReason = "Family trip after the lunch rush.";
const timeOffNotes = "Back for the Saturday open.";
const shiftColor = "#2255aa";
const personName = "Pedro Alves";

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

export async function runScheduleTextTranslationTests() {
  assert.deepEqual(translatableFieldRule(SCHEDULE_TEXT_TABLE, "title"), {});
  assert.deepEqual(translatableFieldRule(SCHEDULE_TEXT_TABLE, "notes"), {});
  assert.equal(translatableFieldRule(SCHEDULE_TEXT_TABLE, "color"), null);
  assert.deepEqual(translatableFieldRule(TIME_OFF_TEXT_TABLE, "reason"), {});
  assert.deepEqual(translatableFieldRule(TIME_OFF_TEXT_TABLE, "notes"), {});

  const shiftFields = shiftTranslationFields({ title: shiftTitle, notes: shiftNotes });
  const timeOffFields = timeOffTranslationFields({
    reason: timeOffReason,
    notes: timeOffNotes,
  });
  assert.deepEqual(
    shiftFields.map((field) => field.fieldPath),
    ["title", "notes"],
  );
  assert.deepEqual(
    timeOffFields.map((field) => field.fieldPath),
    ["reason", "notes"],
  );
  const sent = [...shiftFields, ...timeOffFields].map((field) => field.text);
  assert.equal(sent.includes(shiftColor), false);
  assert.equal(sent.includes(personName), false);

  const stored = fieldCache();
  const seen: string[] = [];
  const model = {
    async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
      seen.push(text);
      return { text: `${targetLocale}:${text}` };
    },
  };
  const shared = {
    companyId: "company-1",
    sourceLocale: "en" as const,
    viewerLocale: "es" as const,
    cache: stored.cache,
    model,
    budget: { async allowed() { return true; } },
  };
  const shift = await translateScheduleFields({
    ...shared,
    sourceTable: SCHEDULE_TEXT_TABLE,
    sourceId: "shift-1",
    fields: shiftFields,
  });
  const timeOff = await translateScheduleFields({
    ...shared,
    sourceTable: TIME_OFF_TEXT_TABLE,
    sourceId: "request-1",
    fields: timeOffFields,
  });
  assert.deepEqual(shift, [`es:${shiftTitle}`, `es:${shiftNotes}`]);
  assert.deepEqual(timeOff, [`es:${timeOffReason}`, `es:${timeOffNotes}`]);
  assert.equal(seen.length, 20);
  assert.equal(seen.includes(shiftColor), false);
  assert.equal(seen.includes(personName), false);
  assert.equal(
    stored.rows(SCHEDULE_TEXT_TABLE, "title").every((row) => row.sourceHash === sourceHash(shiftTitle)),
    true,
  );

  const shiftRows = ["title", "notes"].flatMap((fieldPath) =>
    stored.rows(SCHEDULE_TEXT_TABLE, fieldPath).map((row) => ({
      sourceId: "shift-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolvedShift = await resolveShiftText(
    { id: "shift-1", title: shiftTitle, notes: shiftNotes },
    shiftRows,
    "es",
  );
  assert.equal(resolvedShift.translation?.title, `es:${shiftTitle}`);
  assert.equal(resolvedShift.translation?.notes, `es:${shiftNotes}`);

  const timeOffRows = ["reason", "notes"].flatMap((fieldPath) =>
    stored.rows(TIME_OFF_TEXT_TABLE, fieldPath).map((row) => ({
      sourceId: "request-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolvedRequest = await resolveTimeOffText(
    { id: "request-1", reason: timeOffReason, notes: timeOffNotes },
    timeOffRows,
    "es",
  );
  assert.equal(resolvedRequest.translation?.reason, `es:${timeOffReason}`);
  assert.equal(resolvedRequest.translation?.notes, `es:${timeOffNotes}`);
  const author = await resolveTimeOffText(
    { id: "request-1", reason: timeOffReason, notes: timeOffNotes },
    timeOffRows,
    "en",
  );
  assert.equal(author.translation, null);
}
