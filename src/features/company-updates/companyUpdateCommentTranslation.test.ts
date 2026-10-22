import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  sourceHash,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";

import {
  COMPANY_UPDATE_COMMENT_FIELD_PATH,
  COMPANY_UPDATE_COMMENT_TABLE,
  commentTranslationForViewer,
  resolveCommentTranslation,
} from "./companyUpdateCommentTranslation";

const original = "The walk-in is ready for the lunch rush.";
const spanish = "La cámara está lista para el turno del almuerzo.";

function fieldCache() {
  const store = new Map<string, ContentTranslationRow[]>();
  let fieldPath = "";
  const cache: ContentTranslationCache = {
    async read() {
      return store.get(fieldPath) ?? [];
    },
    async replace(input) {
      fieldPath = input.fieldPath;
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
  return {
    cache,
    fieldPath: () => fieldPath,
    rows: () => store.get(COMPANY_UPDATE_COMMENT_FIELD_PATH) ?? [],
  };
}

export async function runCompanyUpdateCommentTranslationTests() {
  const es = JSON.parse(readFileSync(resolve("src/locales/es.json"), "utf8")) as {
    i18n: { translatedFrom: string; seeTranslation: string };
  };
  const spanishLine = es.i18n.translatedFrom.replace("{{language}}", "English");
  const stored = fieldCache();
  let calls = 0;
  const translated = await translateContent({
    companyId: "company-1",
    sourceTable: COMPANY_UPDATE_COMMENT_TABLE,
    sourceId: "comment-1",
    fieldPath: COMPANY_UPDATE_COMMENT_FIELD_PATH,
    sourceLocale: "en",
    viewerLocale: "es",
    text: original,
    cache: stored.cache,
    model: {
      async translate({ targetLocale }) {
        calls += 1;
        return { text: targetLocale === "es" ? spanish : `${targetLocale}:${original}` };
      },
    },
    budget: { async allowed() { return true; } },
  });

  assert.equal(COMPANY_UPDATE_COMMENT_FIELD_PATH, "content");
  assert.equal(stored.fieldPath(), "content");
  assert.equal(translated.text, spanish);
  assert.equal(calls, 5);
  assert.equal(
    stored.rows().every((row) => row.sourceHash === sourceHash(original)),
    true,
  );

  const viewer = commentTranslationForViewer({
    sourceLocale: "en",
    viewerLocale: "es",
    original,
    translated: spanish,
    showingOriginal: false,
    translatedFrom: spanishLine,
    seeTranslation: es.i18n.seeTranslation,
  });
  assert.equal(viewer.body, spanish);
  assert.equal(viewer.control, "Traducido de English. Ver original");

  const author = commentTranslationForViewer({
    sourceLocale: "en",
    viewerLocale: "en",
    original,
    translated: spanish,
    showingOriginal: false,
    translatedFrom: "Translated from English. See original",
    seeTranslation: "See translation",
  });
  assert.equal(author.body, original);
  assert.equal(author.control, null);

  const resolved = await resolveCommentTranslation({
    id: "comment-1",
    content: original,
    viewerLocale: "es",
    rows: stored.rows().map((row) => ({
      sourceId: "comment-1",
      fieldPath: "content",
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  });
  assert.equal(resolved.translation?.content, spanish);
  assert.equal(resolved.needsRequest, false);

  const sameLanguage = await resolveCommentTranslation({
    id: "comment-1",
    content: original,
    viewerLocale: "en",
    rows: stored.rows().map((row) => ({
      sourceId: "comment-1",
      fieldPath: "content",
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  });
  assert.equal(sameLanguage.translation, null);
  assert.equal(sameLanguage.needsRequest, false);
}
