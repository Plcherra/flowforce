import assert from "node:assert/strict";

import {
  sourceHash,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  ANNOUNCEMENT_TABLE,
  announcementTranslationFields,
  resolveAnnouncementTranslation,
} from "./announcementContent";

const announcementTitle = "Kitchen close tonight";
const announcementContent = "The line closes at ten. Wipe the pass before you leave.";

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

export async function runAnnouncementTranslationTests() {
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.announcements ?? {}).sort(), [
    "content",
    "title",
  ]);
  const fields = announcementTranslationFields({
    title: announcementTitle,
    content: announcementContent,
  });
  assert.deepEqual(
    fields.map((field) => field.fieldPath),
    ["title", "content"],
  );
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
    sourceTable: ANNOUNCEMENT_TABLE,
    sourceId: "announcement-1",
    sourceLocale: "en" as const,
    viewerLocale: "es" as const,
    cache: stored.cache,
    model,
    budget: { async allowed() { return true; } },
  };
  const title = await translateContent({ ...shared, fieldPath: "title", text: announcementTitle });
  const content = await translateContent({
    ...shared,
    fieldPath: "content",
    text: announcementContent,
  });
  assert.equal(title.text, `es:${announcementTitle}`);
  assert.equal(content.text, `es:${announcementContent}`);
  assert.equal(calls, 10);
  const again = await translateContent({ ...shared, fieldPath: "title", text: announcementTitle });
  assert.equal(again.text, `es:${announcementTitle}`);
  assert.equal(calls, 10);
  assert.equal(
    stored.rows("content").every((row) => row.sourceHash === sourceHash(announcementContent)),
    true,
  );
  const rows = ["title", "content"].flatMap((fieldPath) =>
    stored.rows(fieldPath).map((row) => ({
      sourceId: "announcement-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveAnnouncementTranslation(
    { id: "announcement-1", title: announcementTitle, content: announcementContent },
    rows,
    "es",
  );
  assert.equal(resolved.translation?.title, `es:${announcementTitle}`);
  assert.equal(resolved.translation?.content, `es:${announcementContent}`);
  const author = await resolveAnnouncementTranslation(
    { id: "announcement-1", title: announcementTitle, content: announcementContent },
    rows,
    "en",
  );
  assert.equal(author.translation, null);
}
