import assert from "node:assert/strict";

import {
  sourceHash,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import { GOAL_TABLE, goalTranslationFields, resolveGoalTranslation } from "./goalContent";

const goalTitle = "Cut the lunch ticket time";
const goalDescription = "Get the average ticket under twelve minutes on weekdays.";

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

export async function runGoalTranslationTests() {
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.goals ?? {}).sort(), [
    "description",
    "title",
  ]);
  const fields = goalTranslationFields({ title: goalTitle, description: goalDescription });
  assert.deepEqual(
    fields.map((field) => field.fieldPath),
    ["title", "description"],
  );
  const stored = fieldCache();
  let calls = 0;
  const shared = {
    companyId: "company-1",
    sourceTable: GOAL_TABLE,
    sourceId: "goal-1",
    sourceLocale: "en" as const,
    viewerLocale: "es" as const,
    cache: stored.cache,
    model: {
      async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
        calls += 1;
        return { text: `${targetLocale}:${text}` };
      },
    },
    budget: { async allowed() { return true; } },
  };
  const title = await translateContent({ ...shared, fieldPath: "title", text: goalTitle });
  const description = await translateContent({
    ...shared,
    fieldPath: "description",
    text: goalDescription,
  });
  assert.equal(title.text, `es:${goalTitle}`);
  assert.equal(description.text, `es:${goalDescription}`);
  assert.equal(calls, 10);
  const again = await translateContent({ ...shared, fieldPath: "title", text: goalTitle });
  assert.equal(again.text, `es:${goalTitle}`);
  assert.equal(calls, 10);
  assert.equal(
    stored.rows("description").every((row) => row.sourceHash === sourceHash(goalDescription)),
    true,
  );
  const rows = ["title", "description"].flatMap((fieldPath) =>
    stored.rows(fieldPath).map((row) => ({
      sourceId: "goal-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveGoalTranslation(
    { id: "goal-1", title: goalTitle, description: goalDescription },
    rows,
    "es",
  );
  assert.equal(resolved.translation?.title, `es:${goalTitle}`);
  assert.equal(resolved.translation?.description, `es:${goalDescription}`);
  const author = await resolveGoalTranslation(
    { id: "goal-1", title: goalTitle, description: goalDescription },
    rows,
    "en",
  );
  assert.equal(author.translation, null);
}
