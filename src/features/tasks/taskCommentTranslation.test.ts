import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { translatedTextView } from "@/features/i18n/translatedTextView";
import {
  sourceHash,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { translatableFieldRule } from "@/server/i18n/translatableFields";

import {
  TASK_COMMENT_FIELD_PATH,
  TASK_COMMENT_TABLE,
  resolveTaskCommentTranslation,
} from "./taskCommentContent";

const commentText = "The walk-in is ready before the dinner rush.";

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
  return { cache, rows: () => store.get(TASK_COMMENT_FIELD_PATH) ?? [] };
}

export async function runTaskCommentTranslationTests() {
  assert.equal(TASK_COMMENT_FIELD_PATH, "comment");
  assert.deepEqual(translatableFieldRule(TASK_COMMENT_TABLE, "comment"), {});
  assert.equal(translatableFieldRule(TASK_COMMENT_TABLE, "title"), null);
  const es = JSON.parse(readFileSync(resolve("src/locales/es.json"), "utf8")) as {
    i18n: { translatedFrom: string; seeTranslation: string };
  };
  const spanishLine = es.i18n.translatedFrom.replace("{{language}}", "English");
  const stored = fieldCache();
  let calls = 0;
  const shared = {
    companyId: "company-1",
    sourceTable: TASK_COMMENT_TABLE,
    sourceId: "comment-1",
    fieldPath: TASK_COMMENT_FIELD_PATH,
    sourceLocale: "en" as const,
    text: commentText,
    cache: stored.cache,
    model: {
      async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
        calls += 1;
        return { text: `${targetLocale}:${text}` };
      },
    },
    budget: { async allowed() { return true; } },
  };
  const first = await translateContent({ ...shared, viewerLocale: "es" });
  assert.equal(first.text, `es:${commentText}`);
  assert.equal(calls, 5);
  assert.equal(
    stored.rows().every((row) => row.sourceHash === sourceHash(commentText)),
    true,
  );

  const cached = await translateContent({ ...shared, viewerLocale: "es" });
  assert.equal(cached.text, `es:${commentText}`);
  assert.equal(calls, 5);

  const viewer = translatedTextView({
    sourceLocale: "en",
    viewerLocale: "es",
    original: commentText,
    translated: `es:${commentText}`,
    showingOriginal: false,
    translatedFrom: spanishLine,
    seeTranslation: es.i18n.seeTranslation,
  });
  assert.equal(viewer.body, `es:${commentText}`);
  assert.equal(viewer.control, "Traducido de English. Ver original");

  const authorView = translatedTextView({
    sourceLocale: "en",
    viewerLocale: "en",
    original: commentText,
    translated: `es:${commentText}`,
    showingOriginal: false,
    translatedFrom: "Translated from English. See original",
    seeTranslation: "See translation",
  });
  assert.equal(authorView.body, commentText);
  assert.equal(authorView.control, null);

  const rows = stored.rows().map((row) => ({
    sourceId: "comment-1",
    fieldPath: TASK_COMMENT_FIELD_PATH,
    locale: row.locale,
    sourceLocale: "en",
    sourceHash: row.sourceHash,
    translatedText: row.translatedText,
  }));
  const resolved = await resolveTaskCommentTranslation({
    id: "comment-1",
    comment: commentText,
    viewerLocale: "es",
    rows,
  });
  assert.equal(resolved.translation?.comment, `es:${commentText}`);
  assert.equal(resolved.needsRequest, false);

  const author = await resolveTaskCommentTranslation({
    id: "comment-1",
    comment: commentText,
    viewerLocale: "en",
    rows,
  });
  assert.equal(author.translation, null);
  assert.equal(author.needsRequest, false);
}
