import assert from "node:assert/strict";

import { sha256Hex } from "@/i18n/sourceHash";
import {
  sourceHash,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  FORM_CONTENT_FIELD_PATHS,
  formContentTranslationFields,
  resolveFormContentTranslation,
  saveFormWithoutModel,
  withFormSourceLocale,
} from "./formContentFields";
import { translateFormFields } from "./translateFormContent";

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

const formTitle = "Opening checklist";
const formDescription = "Walk the line before the doors open.";
const editedDescription = "Walk the line and check the cold hold.";

export async function runFormContentTranslationTests() {
  assert.deepEqual(FORM_CONTENT_FIELD_PATHS, ["title", "description"]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.forms ?? {}).sort(), [
    "description",
    "title",
  ]);
  assert.equal(
    formContentTranslationFields({
      title: formTitle,
      description: formDescription,
    }).some((field) => field.fieldPath === "label"),
    false,
  );
  assert.equal(await sha256Hex(formDescription), sourceHash(formDescription));

  const stored = fieldCache();
  const calls = { count: 0 };
  const model = {
    async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
      calls.count += 1;
      return { text: `${targetLocale}:${text}` };
    },
  };
  const budget = { async allowed() { return true; } };
  const first = await translateFormFields({
    companyId: "company-1",
    sourceId: "form-1",
    sourceLocale: "en",
    viewerLocale: "es",
    title: formTitle,
    description: formDescription,
    cache: stored.cache,
    model,
    budget,
  });

  assert.equal(first.title, `es:${formTitle}`);
  assert.equal(first.description, `es:${formDescription}`);
  assert.equal(first.sourceLocale, "en");
  assert.equal(calls.count, 10);
  assert.deepEqual(stored.writes().slice(0, 2), ["title", "description"]);

  const cached = await translateFormFields({
    companyId: "company-1",
    sourceId: "form-1",
    sourceLocale: "en",
    viewerLocale: "es",
    title: formTitle,
    description: formDescription,
    cache: stored.cache,
    model,
    budget,
  });
  assert.equal(cached.title, `es:${formTitle}`);
  assert.equal(calls.count, 10);

  const english = await translateFormFields({
    companyId: "company-1",
    sourceId: "form-1",
    sourceLocale: "en",
    viewerLocale: "en",
    title: formTitle,
    description: formDescription,
    cache: stored.cache,
    model,
    budget,
  });
  assert.equal(english.title, formTitle);
  assert.equal(english.description, formDescription);
  assert.equal(calls.count, 10);

  const titleHash = sourceHash(formTitle);
  const edited = await translateFormFields({
    companyId: "company-1",
    sourceId: "form-1",
    sourceLocale: "en",
    viewerLocale: "es",
    title: formTitle,
    description: editedDescription,
    cache: stored.cache,
    model,
    budget,
  });
  assert.equal(edited.description, `es:${editedDescription}`);
  assert.equal(
    stored.rows("description").every((row) => row.sourceHash === sourceHash(editedDescription)),
    true,
  );
  assert.equal(
    stored.rows("description").some((row) => row.translatedText.includes(formDescription)),
    false,
  );
  assert.equal(
    stored.rows("title").every((row) => row.sourceHash === titleHash),
    true,
  );
  assert.equal(calls.count, 15);

  const settings = withFormSourceLocale({ sourceDocumentId: "doc-1" }, "en");
  assert.equal(settings.contentSourceLocale, "en");
  assert.equal(settings.sourceDocumentId, "doc-1");

  let saved = false;
  let translated = false;
  await saveFormWithoutModel({
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

  await saveFormWithoutModel({
    async save() {
      saved = true;
    },
    async translate() {
      throw new Error("model down");
    },
  });
  assert.equal(saved, true);

  const cachedRows = ["title", "description"].flatMap((fieldPath) =>
    stored.rows(fieldPath).map((row) => ({
      sourceId: "form-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveFormContentTranslation(
    {
      id: "form-1",
      title: formTitle,
      description: editedDescription,
      settings,
    },
    cachedRows,
    "es",
  );
  assert.equal(resolved.translation?.title, `es:${formTitle}`);
  assert.equal(resolved.translation?.description, `es:${editedDescription}`);
  assert.equal(resolved.needsRequest, false);

  const author = await resolveFormContentTranslation(
    {
      id: "form-1",
      title: formTitle,
      description: formDescription,
      settings,
    },
    cachedRows,
    "en",
  );
  assert.equal(author.translation, null);
  assert.equal(author.needsRequest, false);
}
