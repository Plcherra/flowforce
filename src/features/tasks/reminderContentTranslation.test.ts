import assert from "node:assert/strict";

import { sha256Hex } from "@/i18n/sourceHash";
import {
  sourceHash,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  REMINDER_CONTENT_FIELD_PATHS,
  reminderNotificationCopy,
  resolveReminderContentTranslation,
} from "./reminderContentFields";
import { translateReminderFields } from "./translateReminderContent";

function fieldCache() {
  const store = new Map<string, ContentTranslationRow[]>();
  const cache: ContentTranslationCache = {
    async read(input) {
      return store.get(input.fieldPath) ?? [];
    },
    async replace(input) {
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
  return { cache, rows: (fieldPath: string) => store.get(fieldPath) ?? [] };
}

const reminderTitle = "Check the walk-in temperature";
const reminderDescription = "Look at the gauge before the dinner rush.";
const editedDescription = "Look at the gauge and write the reading.";

export async function runReminderContentTranslationTests() {
  assert.deepEqual(REMINDER_CONTENT_FIELD_PATHS, ["title", "description"]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.reminders ?? {}).sort(), [
    "description",
    "title",
  ]);
  assert.equal(await sha256Hex(reminderDescription), sourceHash(reminderDescription));

  const empty = await reminderNotificationCopy({
    title: reminderTitle,
    description: reminderDescription,
    viewerLocale: "es",
    rows: [],
  });
  assert.equal(empty.title, reminderTitle);
  assert.equal(empty.description, reminderDescription);

  const stored = fieldCache();
  const calls = { count: 0 };
  const model = {
    async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
      calls.count += 1;
      return { text: `${targetLocale}:${text}` };
    },
  };
  const budget = { async allowed() { return true; } };
  const shared = {
    companyId: "company-1",
    sourceId: "reminder-1",
    sourceLocale: "en" as const,
    title: reminderTitle,
    description: reminderDescription,
    cache: stored.cache,
    model,
    budget,
  };
  const first = await translateReminderFields({ ...shared, viewerLocale: "es" });
  assert.equal(first.title, `es:${reminderTitle}`);
  assert.equal(first.description, `es:${reminderDescription}`);
  assert.equal(calls.count, 10);

  const cached = await translateReminderFields({ ...shared, viewerLocale: "es" });
  assert.equal(cached.title, `es:${reminderTitle}`);
  assert.equal(calls.count, 10);

  const rowsFor = (description: string) =>
    ["title", "description"].flatMap((fieldPath) =>
      stored.rows(fieldPath).map((row) => ({
        sourceId: "reminder-1",
        fieldPath,
        locale: row.locale,
        sourceLocale: "en",
        sourceHash: row.sourceHash,
        translatedText: row.translatedText,
      })),
    ).filter((row) => row.fieldPath !== "description" || description === reminderDescription);

  const notified = await reminderNotificationCopy({
    title: reminderTitle,
    description: reminderDescription,
    viewerLocale: "es",
    rows: rowsFor(reminderDescription),
  });
  assert.equal(notified.title, `es:${reminderTitle}`);
  assert.equal(notified.description, `es:${reminderDescription}`);

  const stale = await reminderNotificationCopy({
    title: reminderTitle,
    description: editedDescription,
    viewerLocale: "es",
    rows: rowsFor(reminderDescription),
  });
  assert.equal(stale.title, `es:${reminderTitle}`);
  assert.equal(stale.description, editedDescription);

  const edited = await translateReminderFields({
    ...shared,
    viewerLocale: "es",
    description: editedDescription,
  });
  assert.equal(edited.description, `es:${editedDescription}`);
  assert.equal(calls.count, 15);

  const freshRows = ["title", "description"].flatMap((fieldPath) =>
    stored.rows(fieldPath).map((row) => ({
      sourceId: "reminder-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveReminderContentTranslation(
    { id: "reminder-1", title: reminderTitle, description: editedDescription },
    freshRows,
    "es",
  );
  assert.equal(resolved.translation?.title, `es:${reminderTitle}`);
  assert.equal(resolved.translation?.description, `es:${editedDescription}`);
  assert.equal(resolved.needsRequest, false);

  const author = await resolveReminderContentTranslation(
    { id: "reminder-1", title: reminderTitle, description: reminderDescription },
    freshRows,
    "en",
  );
  assert.equal(author.translation, null);
}
