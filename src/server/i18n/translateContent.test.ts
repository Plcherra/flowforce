import assert from "node:assert/strict";

import { APP_LANGUAGES } from "@/i18n/resolveLanguage";

import {
  CONTENT_TRANSLATION_MODEL,
  CONTENT_TRANSLATION_PROMPT_KEY,
  isNonTranslatable,
  sourceHash,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
  type ContentUsageEvent,
} from "./translateContent";

function memoryCache() {
  let rows: ContentTranslationRow[] = [];
  let writes = 0;
  const cache: ContentTranslationCache = {
    async read() {
      return rows;
    },
    async replace(input) {
      writes += 1;
      rows = input.rows.map((row) => ({
        locale: row.locale,
        sourceHash: input.sourceHash,
        translatedText: row.translatedText,
      }));
    },
  };
  return {
    cache,
    writes: () => writes,
    rows: () => rows,
  };
}

export async function runTranslateContentTests() {
  const original = "Close the walk-in before 9.";
  const stored = memoryCache();
  let calls = 0;
  const usage: ContentUsageEvent[] = [];
  const model = {
    async translate({
      targetLocale,
    }: {
      text: string;
      targetLocale: string;
    }) {
      calls += 1;
      return { text: `${targetLocale}:${original}`, inputTokens: 3, outputTokens: 4 };
    },
  };

  const first = await translateContent({
    companyId: "company-1",
    sourceTable: "tasks",
    sourceId: "task-1",
    fieldPath: "title",
    sourceLocale: "en",
    viewerLocale: "es",
    text: original,
    cache: stored.cache,
    model,
    budget: { async allowed() { return true; } },
    recordUsage: async (event) => {
      usage.push(event);
    },
  });

  assert.equal(first.text, `es:${original}`);
  assert.equal(first.cached, true);
  assert.equal(first.sourceHash, sourceHash(original));
  assert.equal(calls, 5);
  assert.equal(stored.writes(), 1);
  assert.deepEqual(
    stored.rows().map((row) => row.locale).sort(),
    ["de", "es", "fr", "it", "pt"],
  );
  assert.equal(
    stored.rows().every((row) => row.sourceHash === sourceHash(original)),
    true,
  );
  assert.equal(usage.length, 1);
  assert.equal(usage[0]?.promptKey, CONTENT_TRANSLATION_PROMPT_KEY);
  assert.equal(usage[0]?.model, CONTENT_TRANSLATION_MODEL);
  assert.equal(usage[0]?.status, "succeeded");
  assert.equal(usage[0]?.inputTokens, 15);
  assert.equal(usage[0]?.outputTokens, 20);

  const second = await translateContent({
    companyId: "company-1",
    sourceTable: "tasks",
    sourceId: "task-1",
    fieldPath: "title",
    sourceLocale: "en",
    viewerLocale: "es",
    text: original,
    cache: stored.cache,
    model,
    budget: { async allowed() { return true; } },
    recordUsage: async (event) => {
      usage.push(event);
    },
  });
  assert.equal(second.text, `es:${original}`);
  assert.equal(calls, 5);
  assert.equal(stored.writes(), 1);
  assert.equal(usage.length, 1);

  const sourceViewer = await translateContent({
    companyId: "company-1",
    sourceTable: "tasks",
    sourceId: "task-1",
    fieldPath: "title",
    sourceLocale: "en",
    viewerLocale: "en",
    text: original,
    cache: stored.cache,
    model,
    budget: { async allowed() { return true; } },
  });
  assert.equal(sourceViewer.text, original);
  assert.equal(calls, 5);

  const edited = "Close the walk-in before 10.";
  const editedResult = await translateContent({
    companyId: "company-1",
    sourceTable: "tasks",
    sourceId: "task-1",
    fieldPath: "title",
    sourceLocale: "en",
    viewerLocale: "fr",
    text: edited,
    cache: stored.cache,
    model: {
      async translate({ targetLocale }) {
        calls += 1;
        return { text: `${targetLocale}:${edited}` };
      },
    },
    budget: { async allowed() { return true; } },
  });
  assert.equal(editedResult.text, `fr:${edited}`);
  assert.equal(stored.rows().every((row) => row.sourceHash === sourceHash(edited)), true);
  assert.equal(stored.rows().some((row) => row.translatedText.includes(original)), false);

  const failedCache = memoryCache();
  let failedCalls = 0;
  const failed = await translateContent({
    companyId: "company-1",
    sourceTable: "tasks",
    sourceId: "task-2",
    fieldPath: "title",
    sourceLocale: "en",
    viewerLocale: "de",
    text: original,
    cache: failedCache.cache,
    model: {
      async translate() {
        failedCalls += 1;
        throw new Error("model down");
      },
    },
    budget: { async allowed() { return true; } },
  });
  assert.equal(failed.text, original);
  assert.equal(failed.cached, false);
  assert.equal(failedCalls, 1);
  assert.equal(failedCache.writes(), 0);
  assert.equal(failedCache.rows().length, 0);

  const blockedCache = memoryCache();
  let blockedCalls = 0;
  const blockedUsage: ContentUsageEvent[] = [];
  const blocked = await translateContent({
    companyId: "company-1",
    sourceTable: "tasks",
    sourceId: "task-3",
    fieldPath: "title",
    sourceLocale: "en",
    viewerLocale: "pt",
    text: original,
    cache: blockedCache.cache,
    model: {
      async translate() {
        blockedCalls += 1;
        return { text: "should not run" };
      },
    },
    budget: { async allowed() { return false; } },
    recordUsage: async (event) => {
      blockedUsage.push(event);
    },
  });
  assert.equal(blocked.text, original);
  assert.equal(blockedCalls, 0);
  assert.equal(blockedCache.writes(), 0);
  assert.equal(blockedUsage[0]?.status, "budget_blocked");

  const emptyCache = memoryCache();
  const empty = await translateContent({
    companyId: "company-1",
    sourceTable: "tasks",
    sourceId: "task-4",
    fieldPath: "title",
    sourceLocale: "en",
    viewerLocale: "it",
    text: "   ",
    cache: emptyCache.cache,
    model,
    budget: { async allowed() { return true; } },
  });
  assert.equal(empty.text, "   ");
  assert.equal(emptyCache.writes(), 0);

  const nameCache = memoryCache();
  const name = await translateContent({
    companyId: "company-1",
    sourceTable: "vendor_visits",
    sourceId: "visit-1",
    fieldPath: "vendor_name",
    sourceLocale: "en",
    viewerLocale: "es",
    text: "Pedro Alvarez",
    fieldKind: "name",
    cache: nameCache.cache,
    model,
    budget: { async allowed() { return true; } },
  });
  assert.equal(name.text, "Pedro Alvarez");
  assert.equal(nameCache.writes(), 0);

  assert.equal(isNonTranslatable(""), true);
  assert.equal(isNonTranslatable("owner@example.com"), true);
  assert.equal(isNonTranslatable("https://flowforce.uk/schedule"), true);
  assert.equal(isNonTranslatable("$18.50"), true);
  assert.equal(isNonTranslatable("2026-10-22"), true);
  assert.equal(isNonTranslatable("photo.png"), true);
  assert.equal(isNonTranslatable("SKU-1044"), true);
  assert.equal(isNonTranslatable("Email owner@example.com about the delivery."), false);
  assert.equal(APP_LANGUAGES.length, 6);
}
