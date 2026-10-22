import assert from "node:assert/strict";

import { sha256Hex } from "@/i18n/sourceHash";
import {
  sourceHash,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  COMPANY_UPDATE_FIELD_PATHS,
  companyUpdateTranslationFields,
  companyUpdateWriteColumns,
  resolveCompanyUpdateTranslation,
  saveCompanyUpdateWithoutModel,
  withContentSourceLocale,
} from "./companyUpdateFields";
import { translateCompanyUpdateFields } from "./translateCompanyUpdate";

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
  return {
    cache,
    writes: () => writes,
    rows: (fieldPath: string) => store.get(fieldPath) ?? [],
  };
}

function preservingModel(calls: { count: number }) {
  return {
    async translate({
      text,
      targetLocale,
    }: {
      text: string;
      targetLocale: string;
    }) {
      calls.count += 1;
      if (text.includes("<")) {
        return {
          text: text.replace(
            />([^<]+)</g,
            (_match, inner: string) => `>${targetLocale}:${inner.trim()}<`,
          ),
        };
      }
      return { text: `${targetLocale}:${text}` };
    },
  };
}

const updateTitle = "Walk-in is closed";
const updateBody = "Close the walk-in before 9.";
const rich = "<p>Bring the delivery inside.</p>";
const editedBody = "Close the walk-in before 10.";

export async function runCompanyUpdateTranslationTests() {
  assert.deepEqual(COMPANY_UPDATE_FIELD_PATHS, ["title", "body", "rich_content"]);
  assert.deepEqual(
    Object.keys(TRANSLATABLE_FIELDS.company_updates ?? {}).sort(),
    ["body", "rich_content", "title"],
  );
  assert.equal(
    companyUpdateTranslationFields({
      title: updateTitle,
      body: updateBody,
      richContent: rich,
    }).some((field) => field.fieldPath === "content"),
    false,
  );
  assert.equal(await sha256Hex(updateBody), sourceHash(updateBody));

  const stored = fieldCache();
  const calls = { count: 0 };
  const model = preservingModel(calls);
  const budget = { async allowed() { return true; } };
  const first = await translateCompanyUpdateFields({
    companyId: "company-1",
    sourceId: "update-1",
    sourceLocale: "en",
    viewerLocale: "es",
    title: updateTitle,
    body: updateBody,
    richContent: rich,
    cache: stored.cache,
    model,
    budget,
  });

  assert.equal(first.title, `es:${updateTitle}`);
  assert.equal(first.body, `es:${updateBody}`);
  assert.equal(first.richContent, "<p>es:Bring the delivery inside.</p>");
  assert.equal(first.sourceLocale, "en");
  assert.equal(calls.count, 15);
  assert.deepEqual(stored.writes().slice(0, 3), ["title", "body", "rich_content"]);
  assert.equal(
    stored.rows("body").every((row) => row.sourceHash === sourceHash(updateBody)),
    true,
  );

  const cached = await translateCompanyUpdateFields({
    companyId: "company-1",
    sourceId: "update-1",
    sourceLocale: "en",
    viewerLocale: "es",
    title: updateTitle,
    body: updateBody,
    richContent: rich,
    cache: stored.cache,
    model,
    budget,
  });
  assert.equal(cached.body, `es:${updateBody}`);
  assert.equal(calls.count, 15);

  const english = await translateCompanyUpdateFields({
    companyId: "company-1",
    sourceId: "update-1",
    sourceLocale: "en",
    viewerLocale: "en",
    title: updateTitle,
    body: updateBody,
    richContent: rich,
    cache: stored.cache,
    model,
    budget,
  });
  assert.equal(english.title, updateTitle);
  assert.equal(english.body, updateBody);
  assert.equal(calls.count, 15);

  const titleHash = sourceHash(updateTitle);
  const edited = await translateCompanyUpdateFields({
    companyId: "company-1",
    sourceId: "update-1",
    sourceLocale: "en",
    viewerLocale: "es",
    title: updateTitle,
    body: editedBody,
    richContent: rich,
    cache: stored.cache,
    model,
    budget,
  });
  assert.equal(edited.body, `es:${editedBody}`);
  assert.equal(
    stored.rows("body").every((row) => row.sourceHash === sourceHash(editedBody)),
    true,
  );
  assert.equal(
    stored.rows("body").some((row) => row.translatedText.includes(updateBody)),
    false,
  );
  assert.equal(
    stored.rows("title").every((row) => row.sourceHash === titleHash),
    true,
  );
  assert.equal(calls.count, 20);

  const broken = fieldCache();
  let brokenCalls = 0;
  const rejected = await translateCompanyUpdateFields({
    companyId: "company-1",
    sourceId: "update-2",
    sourceLocale: "en",
    viewerLocale: "es",
    title: updateTitle,
    body: updateBody,
    richContent: rich,
    cache: broken.cache,
    model: {
      async translate({ text, targetLocale }) {
        brokenCalls += 1;
        if (text.includes("<")) return { text: "<div>changed</div>" };
        return { text: `${targetLocale}:${text}` };
      },
    },
    budget,
  });
  assert.equal(rejected.richContent, rich);
  assert.equal(broken.rows("rich_content").length, 0);
  assert.equal(broken.writes().includes("rich_content"), false);
  assert.equal(rejected.title, `es:${updateTitle}`);
  assert.equal(brokenCalls, 11);

  const columns = companyUpdateWriteColumns({
    title: updateTitle,
    body: updateBody,
    richContent: rich,
    type: "news",
    publishingSettings: { notifications: { email: true } },
  });
  assert.equal(columns.title, updateTitle);
  assert.equal(columns.rich_content, rich);
  assert.equal(columns.update_type, "news");
  assert.equal("content" in columns, false);

  const wizardColumns = companyUpdateWriteColumns({
    title: updateTitle,
    body: updateBody,
    richContent: rich,
    type: "announcement",
    priority: "medium",
    backgroundStyle: { type: "solid", primary: "#3b82f6" },
    publishingSettings: { publishNow: true, notifications: { email: true } },
    recipients: { type: "all", targets: [] },
    isPinned: false,
  });
  const companyUpdateColumns = new Set([
    "assigned_employees",
    "author_avatar",
    "author_id",
    "author_name",
    "author_role",
    "background_style",
    "body",
    "is_pinned",
    "priority",
    "publishing_settings",
    "recipients",
    "rich_content",
    "status",
    "title",
    "update_type",
  ]);
  for (const key of Object.keys(wizardColumns)) {
    assert.equal(
      companyUpdateColumns.has(key),
      true,
      `${key} is not a company_updates column`,
    );
  }
  assert.equal(wizardColumns.update_type, "announcement");
  assert.equal(wizardColumns.rich_content, rich);
  assert.equal(wizardColumns.is_pinned, false);
  assert.equal("richContent" in wizardColumns, false);
  assert.equal("type" in wizardColumns, false);
  assert.equal("backgroundStyle" in wizardColumns, false);
  assert.equal("publishingSettings" in wizardColumns, false);
  assert.equal("isPinned" in wizardColumns, false);
  const savedSettings = withContentSourceLocale(columns.publishing_settings, "en");
  assert.equal(savedSettings.contentSourceLocale, "en");
  assert.equal(
    (savedSettings.notifications as { email?: boolean }).email,
    true,
  );

  let saved = false;
  let translated = false;
  await saveCompanyUpdateWithoutModel({
    async save() {
      saved = true;
    },
    async translate() {
      await new Promise((resolve) => setTimeout(resolve, 30));
      translated = true;
    },
  });
  assert.equal(saved, true);
  assert.equal(translated, false);

  await saveCompanyUpdateWithoutModel({
    async save() {
      saved = true;
    },
    async translate() {
      throw new Error("model down");
    },
  });
  assert.equal(saved, true);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(translated, true);

  const cachedRows = ["title", "body"].flatMap((fieldPath) =>
    stored.rows(fieldPath).map((row) => ({
      sourceId: "update-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveCompanyUpdateTranslation(
    {
      id: "update-1",
      title: updateTitle,
      body: editedBody,
      richContent: null,
      contentSourceLocale: "en",
    },
    cachedRows,
    "es",
  );
  assert.equal(resolved.translation?.title, `es:${updateTitle}`);
  assert.equal(resolved.translation?.body, `es:${editedBody}`);
  assert.equal(resolved.needsRequest, false);

  const stale = await resolveCompanyUpdateTranslation(
    {
      id: "update-1",
      title: updateTitle,
      body: updateBody,
      richContent: null,
      contentSourceLocale: "en",
    },
    cachedRows,
    "es",
  );
  assert.equal(stale.translation?.title, `es:${updateTitle}`);
  assert.equal(stale.translation?.body, updateBody);
  assert.equal(stale.needsRequest, true);

  const author = await resolveCompanyUpdateTranslation(
    {
      id: "update-1",
      title: updateTitle,
      body: updateBody,
      richContent: null,
      contentSourceLocale: "en",
    },
    [],
    "en",
  );
  assert.equal(author.translation, null);
  assert.equal(author.needsRequest, false);
}
