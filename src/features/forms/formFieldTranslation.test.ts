import assert from "node:assert/strict";

import { sha256Hex } from "@/i18n/sourceHash";
import {
  sourceHash,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import {
  TRANSLATABLE_FIELDS,
  translatableFieldRule,
} from "@/server/i18n/translatableFields";

import {
  displayAnswer,
  formFieldTranslationFields,
  optionLabelPath,
  readBuilderOptionLabels,
  resolveFormFieldTranslation,
  storedOptionValue,
} from "./formFieldContent";
import { translateFormField } from "./translateFormField";

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

const stationOptions = ["Line", "Expo", "Dish", "Prep", "Register"];
const questionLabel = "Station";
const questionDescription = "Where you work this shift";
const questionPlaceholder = "Choose a station";

export async function runFormFieldTranslationTests() {
  assert.deepEqual(readBuilderOptionLabels(stationOptions), stationOptions);
  assert.deepEqual(
    formFieldTranslationFields({
      label: questionLabel,
      description: questionDescription,
      placeholder: questionPlaceholder,
      options: stationOptions,
    }).map((field) => field.fieldPath),
    [
      "label",
      "description",
      "placeholder",
      "options.0",
      "options.1",
      "options.2",
      "options.3",
      "options.4",
    ],
  );
  assert.deepEqual(
    Object.keys(TRANSLATABLE_FIELDS.form_fields ?? {}).sort(),
    ["description", "label", "placeholder"],
  );
  assert.ok(translatableFieldRule("form_fields", "options.0"));
  assert.equal(translatableFieldRule("form_fields", "options.label"), null);
  assert.equal(translatableFieldRule("forms", "options.0"), null);
  assert.equal(await sha256Hex(stationOptions[0]), sourceHash(stationOptions[0]));

  const stored = fieldCache();
  const calls = { count: 0 };
  const model = {
    async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
      calls.count += 1;
      return { text: `${targetLocale}:${text}` };
    },
  };
  const budget = { async allowed() { return true; } };
  const field = {
    companyId: "company-1",
    sourceId: "field-1",
    sourceLocale: "en" as const,
    label: questionLabel,
    description: questionDescription,
    placeholder: questionPlaceholder,
    options: stationOptions,
    cache: stored.cache,
    model,
    budget,
  };
  const first = await translateFormField({ ...field, viewerLocale: "es" });
  assert.equal(first.label, `es:${questionLabel}`);
  assert.equal(first.description, `es:${questionDescription}`);
  assert.equal(first.placeholder, `es:${questionPlaceholder}`);
  assert.deepEqual(
    first.optionLabels,
    stationOptions.map((option) => `es:${option}`),
  );
  assert.equal(calls.count, 40);
  assert.equal(stored.writes().includes(optionLabelPath(0)), true);

  const cached = await translateFormField({ ...field, viewerLocale: "es" });
  assert.equal(cached.optionLabels[0], `es:${stationOptions[0]}`);
  assert.equal(calls.count, 40);

  const submission = { station: storedOptionValue(stationOptions[0]) };
  assert.equal(submission.station, "Line");
  assert.equal(
    displayAnswer(submission.station, stationOptions, first.optionLabels),
    "es:Line",
  );
  assert.equal(submission.station, "Line");
  assert.deepEqual(
    displayAnswer(["Line", "Prep"], stationOptions, first.optionLabels),
    ["es:Line", "es:Prep"],
  );

  const rows = stored.writes().flatMap((fieldPath) =>
    stored.rows(fieldPath).map((row) => ({
      sourceId: "field-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const resolved = await resolveFormFieldTranslation(
    {
      id: "field-1",
      label: questionLabel,
      description: questionDescription,
      placeholder: questionPlaceholder,
      options: stationOptions,
    },
    rows,
    "es",
    "en",
  );
  assert.equal(resolved.translation?.label, `es:${questionLabel}`);
  assert.equal(resolved.translation?.optionLabels[2], `es:Dish`);
  assert.equal(resolved.needsRequest, false);

  const author = await resolveFormFieldTranslation(
    {
      id: "field-1",
      label: questionLabel,
      description: questionDescription,
      placeholder: questionPlaceholder,
      options: stationOptions,
    },
    rows,
    "en",
    "en",
  );
  assert.equal(author.translation, null);
  assert.equal(author.needsRequest, false);
}
