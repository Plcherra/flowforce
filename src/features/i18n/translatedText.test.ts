import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { translatedTextView } from "./translatedTextView";

const original = "Close the walk-in before 9.";
const translated = "Cierra la cámara antes de las 9.";
const es = JSON.parse(readFileSync(resolve("src/locales/es.json"), "utf8")) as {
  i18n: { translatedFrom: string; seeTranslation: string };
};
const spanishLine = es.i18n.translatedFrom.replace("{{language}}", "English");

export function runTranslatedTextTests() {
  const spanish = translatedTextView({
    sourceLocale: "en",
    viewerLocale: "es",
    original,
    translated,
    showingOriginal: false,
    translatedFrom: spanishLine,
    seeTranslation: es.i18n.seeTranslation,
  });
  assert.equal(spanish.body, translated);
  assert.equal(spanish.control, spanishLine);
  assert.equal(spanishLine, "Traducido de English. Ver original");

  const swapped = translatedTextView({
    sourceLocale: "en",
    viewerLocale: "es",
    original,
    translated,
    showingOriginal: true,
    translatedFrom: spanishLine,
    seeTranslation: es.i18n.seeTranslation,
  });
  assert.equal(swapped.body, original);
  assert.equal(swapped.control, "Ver traducción");

  const english = translatedTextView({
    sourceLocale: "en",
    viewerLocale: "en",
    original,
    translated,
    showingOriginal: false,
    translatedFrom: "Translated from English. See original",
    seeTranslation: "See translation",
  });
  assert.equal(english.body, original);
  assert.equal(english.control, null);
}
