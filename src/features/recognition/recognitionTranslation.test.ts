import assert from "node:assert/strict";

import {
  sourceHash,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  EMPLOYEE_BADGE_TABLE,
  RECOGNITION_EVENT_TABLE,
  badgeReasonFields,
  recognitionMessageFields,
  resolveBadgeReason,
  resolveRecognitionMessage,
} from "./recognitionContent";

const recognitionMessage = "Thanks for closing the line without a cold plate.";
const badgeReason = "Finished the close checklist before the last table left.";
const personName = "Pedro Alves";

function fieldCache() {
  const store = new Map<string, ContentTranslationRow[]>();
  const keyFor = (input: { sourceTable: string; sourceId: string; fieldPath: string }) =>
    `${input.sourceTable}:${input.sourceId}:${input.fieldPath}`;
  const cache: ContentTranslationCache = {
    async read(input) {
      return store.get(keyFor(input)) ?? [];
    },
    async replace(input) {
      store.set(
        keyFor(input),
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
    rows: (sourceTable: string, sourceId: string, fieldPath: string) =>
      store.get(keyFor({ sourceTable, sourceId, fieldPath })) ?? [],
  };
}

export async function runRecognitionTranslationTests() {
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.recognition_events ?? {}), ["message"]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.employee_badge ?? {}), ["reason"]);
  const messageFields = recognitionMessageFields({
    message: recognitionMessage,
    personName,
  });
  const reasonFields = badgeReasonFields({ reason: badgeReason, personName });
  assert.deepEqual(
    messageFields.map((field) => field.fieldPath),
    ["message"],
  );
  assert.deepEqual(
    reasonFields.map((field) => field.fieldPath),
    ["reason"],
  );
  assert.equal(messageFields.some((field) => field.text.includes(personName)), false);
  assert.equal(reasonFields.some((field) => field.text.includes(personName)), false);
  const stored = fieldCache();
  let calls = 0;
  const seen: string[] = [];
  const shared = {
    companyId: "company-1",
    sourceLocale: "en" as const,
    viewerLocale: "es" as const,
    cache: stored.cache,
    model: {
      async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
        calls += 1;
        seen.push(text);
        return { text: `${targetLocale}:${text}` };
      },
    },
    budget: { async allowed() { return true; } },
  };
  const message = await translateContent({
    ...shared,
    sourceTable: RECOGNITION_EVENT_TABLE,
    sourceId: "event-1",
    fieldPath: "message",
    text: recognitionMessage,
  });
  const reason = await translateContent({
    ...shared,
    sourceTable: EMPLOYEE_BADGE_TABLE,
    sourceId: "badge-1",
    fieldPath: "reason",
    text: badgeReason,
  });
  assert.equal(message.text, `es:${recognitionMessage}`);
  assert.equal(reason.text, `es:${badgeReason}`);
  assert.equal(calls, 10);
  assert.equal(seen.some((text) => text.includes(personName)), false);
  const again = await translateContent({
    ...shared,
    sourceTable: RECOGNITION_EVENT_TABLE,
    sourceId: "event-1",
    fieldPath: "message",
    text: recognitionMessage,
  });
  assert.equal(again.text, `es:${recognitionMessage}`);
  assert.equal(calls, 10);
  assert.equal(
    stored
      .rows(EMPLOYEE_BADGE_TABLE, "badge-1", "reason")
      .every((row) => row.sourceHash === sourceHash(badgeReason)),
    true,
  );
  const messageRows = stored.rows(RECOGNITION_EVENT_TABLE, "event-1", "message").map((row) => ({
    sourceId: "event-1",
    fieldPath: "message",
    locale: row.locale,
    sourceLocale: "en",
    sourceHash: row.sourceHash,
    translatedText: row.translatedText,
  }));
  const resolvedMessage = await resolveRecognitionMessage(
    { id: "event-1", message: recognitionMessage },
    messageRows,
    "es",
  );
  assert.equal(resolvedMessage.text, `es:${recognitionMessage}`);
  const reasonRows = stored.rows(EMPLOYEE_BADGE_TABLE, "badge-1", "reason").map((row) => ({
    sourceId: "badge-1",
    fieldPath: "reason",
    locale: row.locale,
    sourceLocale: "en",
    sourceHash: row.sourceHash,
    translatedText: row.translatedText,
  }));
  const resolvedReason = await resolveBadgeReason(
    { id: "badge-1", reason: badgeReason },
    reasonRows,
    "es",
  );
  assert.equal(resolvedReason.text, `es:${badgeReason}`);
  const author = await resolveRecognitionMessage(
    { id: "event-1", message: recognitionMessage },
    messageRows,
    "en",
  );
  assert.equal(author.text, null);
}
