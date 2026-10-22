import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { translatedTextView } from "@/features/i18n/translatedTextView";
import {
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { translatableFieldRule } from "@/server/i18n/translatableFields";

import {
  MESSAGE_FIELD_PATH,
  MESSAGE_TABLE,
  resolveMessageTranslation,
} from "./messageContent";

const messageBody = "The walk-in is down. Move the milk to the spare cooler.";

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
  return { cache, writes: () => writes, rows: () => store.get(MESSAGE_FIELD_PATH) ?? [] };
}

export async function runMessageTranslationTests() {
  assert.equal(MESSAGE_FIELD_PATH, "content");
  assert.deepEqual(translatableFieldRule(MESSAGE_TABLE, "content"), {});
  const es = JSON.parse(readFileSync(resolve("src/locales/es.json"), "utf8")) as {
    i18n: { translatedFrom: string };
  };
  const stored = fieldCache();
  let calls = 0;
  const model = {
    async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
      calls += 1;
      return { text: `${targetLocale}:${text}` };
    },
  };
  const shared = {
    companyId: "company-1",
    sourceTable: MESSAGE_TABLE,
    sourceId: "message-1",
    fieldPath: MESSAGE_FIELD_PATH,
    sourceLocale: "en" as const,
    viewerLocale: "es" as const,
    text: messageBody,
    cache: stored.cache,
    model,
  };
  const blocked = await translateContent({
    ...shared,
    budget: { async allowed() { return false; } },
  });
  assert.equal(blocked.text, messageBody);
  assert.equal(blocked.cached, false);
  assert.equal(calls, 0);
  assert.equal(stored.writes().length, 0);

  const first = await translateContent({
    ...shared,
    budget: { async allowed() { return true; } },
  });
  assert.equal(first.text, `es:${messageBody}`);
  assert.equal(calls, 5);
  const cached = await translateContent({
    ...shared,
    budget: { async allowed() { return true; } },
  });
  assert.equal(cached.text, `es:${messageBody}`);
  assert.equal(cached.cached, true);
  assert.equal(calls, 5);

  const viewer = translatedTextView({
    sourceLocale: "en",
    viewerLocale: "es",
    original: messageBody,
    translated: `es:${messageBody}`,
    showingOriginal: false,
    translatedFrom: es.i18n.translatedFrom.replace("{{language}}", "English"),
    seeTranslation: "Ver traducción",
  });
  assert.equal(viewer.body, `es:${messageBody}`);
  assert.equal(viewer.control, "Traducido de English. Ver original");

  const rows = stored.rows().map((row) => ({
    sourceId: "message-1",
    fieldPath: MESSAGE_FIELD_PATH,
    locale: row.locale,
    sourceLocale: "en",
    sourceHash: row.sourceHash,
    translatedText: row.translatedText,
  }));
  const resolved = await resolveMessageTranslation({
    id: "message-1",
    content: messageBody,
    viewerLocale: "es",
    rows,
  });
  assert.equal(resolved.translation?.content, `es:${messageBody}`);
  assert.equal(resolved.needsRequest, false);
  const author = await resolveMessageTranslation({
    id: "message-1",
    content: messageBody,
    viewerLocale: "en",
    rows,
  });
  assert.equal(author.translation, null);
}
