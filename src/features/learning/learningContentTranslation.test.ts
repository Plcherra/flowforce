import assert from "node:assert/strict";

import {
  sourceHash,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  COURSE_TABLE,
  LEARNING_MODULE_TABLE,
  TRAINING_MODULE_TABLE,
  learningTextFields,
  resolveLearningTranslation,
} from "./learningContent";

const courseTitle = "Close the line without a cold plate";
const courseDescription = "Walk the pass, the lowboy, and the dish pit before you clock out.";
const moduleTitle = "Wipe the pass and label the pans";
const moduleDescription = "Every hotel pan gets a day-dot before it goes back in the lowboy.";

function fieldCache() {
  const store = new Map<string, ContentTranslationRow[]>();
  const keyFor = (input: { sourceTable: string; sourceId: string; fieldPath: string }) =>
    `${input.sourceTable}:${input.sourceId}:${input.fieldPath}`;
  const cache: ContentTranslationCache = {
    async read(input) {
      return store.get(keyFor(input)) ?? [];
    },
    async replace(input) {
      store.set(
        keyFor(input),
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
    rows: (sourceTable: string, sourceId: string, fieldPath: string) =>
      store.get(keyFor({ sourceTable, sourceId, fieldPath })) ?? [],
  };
}

export async function runLearningContentTranslationTests() {
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.learning_courses ?? {}).sort(), [
    "description",
    "title",
  ]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.training_modules ?? {}).sort(), [
    "description",
    "title",
  ]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.learning_modules ?? {}).sort(), [
    "description",
    "title",
  ]);
  assert.deepEqual(
    learningTextFields({ title: courseTitle, description: courseDescription }).map(
      (field) => field.fieldPath,
    ),
    ["title", "description"],
  );
  const stored = fieldCache();
  let calls = 0;
  const model = {
    async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
      calls += 1;
      return { text: `${targetLocale}:${text}` };
    },
  };
  const budget = { async allowed() { return true; } };
  const translate = (
    sourceTable: string,
    sourceId: string,
    fieldPath: "title" | "description",
    text: string,
  ) =>
    translateContent({
      companyId: "company-1",
      sourceTable,
      sourceId,
      fieldPath,
      text,
      sourceLocale: "en",
      viewerLocale: "es",
      cache: stored.cache,
      model,
      budget,
    });
  const courseTitleResult = await translate(COURSE_TABLE, "course-1", "title", courseTitle);
  const courseDescriptionResult = await translate(
    COURSE_TABLE,
    "course-1",
    "description",
    courseDescription,
  );
  const trainingTitle = await translate(
    TRAINING_MODULE_TABLE,
    "training-1",
    "title",
    moduleTitle,
  );
  const trainingDescription = await translate(
    TRAINING_MODULE_TABLE,
    "training-1",
    "description",
    moduleDescription,
  );
  assert.equal(courseTitleResult.text, `es:${courseTitle}`);
  assert.equal(courseDescriptionResult.text, `es:${courseDescription}`);
  assert.equal(trainingTitle.text, `es:${moduleTitle}`);
  assert.equal(trainingDescription.text, `es:${moduleDescription}`);
  assert.equal(calls, 20);
  const again = await translate(COURSE_TABLE, "course-1", "title", courseTitle);
  assert.equal(again.text, `es:${courseTitle}`);
  assert.equal(calls, 20);
  assert.equal(
    stored
      .rows(TRAINING_MODULE_TABLE, "training-1", "description")
      .every((row) => row.sourceHash === sourceHash(moduleDescription)),
    true,
  );
  const courseRows = ["title", "description"].flatMap((fieldPath) =>
    stored.rows(COURSE_TABLE, "course-1", fieldPath).map((row) => ({
      sourceId: "course-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const course = await resolveLearningTranslation(
    { id: "course-1", title: courseTitle, description: courseDescription },
    courseRows,
    "es",
  );
  assert.equal(course.translation?.title, `es:${courseTitle}`);
  assert.equal(course.translation?.description, `es:${courseDescription}`);
  const moduleRows = ["title", "description"].flatMap((fieldPath) =>
    stored.rows(TRAINING_MODULE_TABLE, "training-1", fieldPath).map((row) => ({
      sourceId: "training-1",
      fieldPath,
      locale: row.locale,
      sourceLocale: "en",
      sourceHash: row.sourceHash,
      translatedText: row.translatedText,
    })),
  );
  const trainingModule = await resolveLearningTranslation(
    { id: "training-1", title: moduleTitle, description: moduleDescription },
    moduleRows,
    "es",
  );
  assert.equal(trainingModule.translation?.title, `es:${moduleTitle}`);
  assert.equal(trainingModule.translation?.description, `es:${moduleDescription}`);
  const author = await resolveLearningTranslation(
    { id: "course-1", title: courseTitle, description: courseDescription },
    courseRows,
    "en",
  );
  assert.equal(author.translation, null);
  assert.equal(LEARNING_MODULE_TABLE, "learning_modules");
}
