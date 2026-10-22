import assert from "node:assert/strict";

import { sha256Hex } from "@/i18n/sourceHash";
import {
  sourceHash,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  TASK_CONTENT_FIELD_PATHS,
  resolveTaskContentTranslation,
  withTaskSourceLocale,
} from "./taskContentFields";
import { translateTaskFields } from "./translateTaskContent";

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
  return { cache, writes: () => writes, rows: (fieldPath: string) => store.get(fieldPath) ?? [] };
}

const taskTitle = "Restock the walk-in";
const taskDescription = "Bring the milk and the greens up front.";
const editedDescription = "Bring the milk, greens, and bread up front.";

export async function runTaskContentTranslationTests() {
  assert.deepEqual(TASK_CONTENT_FIELD_PATHS, ["title", "description"]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.tasks ?? {}).sort(), [
    "description",
    "title",
  ]);
  const links = withTaskSourceLocale({ schedule_id: "shift-1" }, "en");
  assert.equal((links as { contentSourceLocale: string }).contentSourceLocale, "en");
  assert.equal((links as { schedule_id: string }).schedule_id, "shift-1");
  assert.deepEqual(withTaskSourceLocale(["tag"], "en"), ["tag"]);
  assert.equal(await sha256Hex(taskDescription), sourceHash(taskDescription));

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
    sourceId: "task-1",
    sourceLocale: "en" as const,
    title: taskTitle,
    description: taskDescription,
    cache: stored.cache,
    model,
    budget,
  };
  const first = await translateTaskFields({ ...shared, viewerLocale: "es" });
  assert.equal(first.title, `es:${taskTitle}`);
  assert.equal(first.description, `es:${taskDescription}`);
  assert.equal(calls.count, 10);

  const cached = await translateTaskFields({ ...shared, viewerLocale: "es" });
  assert.equal(cached.title, `es:${taskTitle}`);
  assert.equal(calls.count, 10);

  const titleHash = sourceHash(taskTitle);
  const edited = await translateTaskFields({
    ...shared,
    viewerLocale: "es",
    description: editedDescription,
  });
  assert.equal(edited.description, `es:${editedDescription}`);
  assert.equal(
    stored.rows("description").every((row) => row.sourceHash === sourceHash(editedDescription)),
    true,
  );
  assert.equal(
    stored.rows("title").every((row) => row.sourceHash === titleHash),
    true,
  );
  assert.equal(calls.count, 15);

  const rows = ["title", "description"].flatMap((fieldPath) =>
    stored.rows(fieldPath).map((row) => ({
      sourceId: "task-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveTaskContentTranslation(
    { id: "task-1", title: taskTitle, description: editedDescription, links },
    rows,
    "es",
  );
  assert.equal(resolved.translation?.title, `es:${taskTitle}`);
  assert.equal(resolved.translation?.description, `es:${editedDescription}`);
  assert.equal(resolved.needsRequest, false);

  const author = await resolveTaskContentTranslation(
    { id: "task-1", title: taskTitle, description: taskDescription, links },
    rows,
    "en",
  );
  assert.equal(author.translation, null);
  assert.equal(author.needsRequest, false);
}
