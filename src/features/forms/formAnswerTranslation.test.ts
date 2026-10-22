import assert from "node:assert/strict";

import {
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { translatableFieldRule } from "@/server/i18n/translatableFields";

import { proseAnswers, submissionAnswerFieldPath } from "./formAnswerContent";
import { translateFormAnswers } from "./translateFormAnswers";

function fieldCache() {
  const store = new Map<string, ContentTranslationRow[]>();
  const writes: string[] = [];
  const cache: ContentTranslationCache = {
    async read(input) {
      return store.get(input.fieldPath) ?? [];
    },
    async replace(input) {
      writes.push(input.fieldPath);
      store.set(
        input.fieldPath,
        input.rows.map((row) => ({
          locale: row.locale,
          sourceHash: input.sourceHash,
          translatedText: row.translatedText,
        })),
      );
    },
  };
  return { cache, writes: () => writes };
}

const fields = [
  { id: "note", field_type: "textarea" },
  { id: "count", field_type: "number" },
  { id: "day", field_type: "date" },
  { id: "stars", field_type: "rating" },
  { id: "photo", field_type: "file" },
  { id: "station", field_type: "select" },
];

const submissionData = {
  note: "The walk-in was warm at open.",
  count: 4,
  day: "2026-10-22",
  stars: { rating_value: 5 },
  photo: [{ name: "cooler.jpg" }],
  station: "Line",
};

export async function runFormAnswerTranslationTests() {
  const answers = proseAnswers({ submissionData, fields });
  assert.deepEqual(
    answers.map((answer) => answer.fieldPath),
    [submissionAnswerFieldPath("note")],
  );
  assert.equal(translatableFieldRule("form_submissions", "submission_data.note") != null, true);
  assert.equal(translatableFieldRule("form_submissions", "station"), null);
  assert.equal(submissionData.station, "Line");

  const stored = fieldCache();
  const sent: string[] = [];
  const translated = await translateFormAnswers({
    companyId: "company-1",
    sourceId: "submission-1",
    sourceLocale: "en",
    viewerLocale: "es",
    submissionData,
    fields,
    cache: stored.cache,
    model: {
      async translate({ text, targetLocale }) {
        sent.push(text);
        return { text: `${targetLocale}:${text}` };
      },
    },
    budget: { async allowed() { return true; } },
  });

  assert.deepEqual(translated.sentFieldPaths, ["submission_data.note"]);
  assert.equal(translated.translation.answers.note, "es:The walk-in was warm at open.");
  assert.equal(sent.every((text) => text === submissionData.note), true);
  assert.equal(sent.some((text) => text === "Line"), false);
  assert.equal(sent.some((text) => text.includes("2026")), false);
  assert.equal(sent.some((text) => text.includes("cooler")), false);
  assert.equal(submissionData.station, "Line");
  assert.equal(submissionData.count, 4);
  assert.deepEqual(stored.writes(), ["submission_data.note"]);
}
