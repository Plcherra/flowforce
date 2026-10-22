import assert from "node:assert/strict";
import { resolveLanguage } from "./resolveLanguage";

export function runResolveLanguageTests() {
  assert.equal(resolveLanguage("es", "de"), "es");
  assert.equal(resolveLanguage("pt", null), "pt");
  assert.equal(resolveLanguage(null, "fr"), "fr");
  assert.equal(resolveLanguage("", "it"), "it");
  assert.equal(resolveLanguage("en-US", "de"), "de");
  assert.equal(resolveLanguage(null, null), "en");
  assert.equal(resolveLanguage("xx", "english"), "en");
  assert.equal(resolveLanguage(undefined, undefined), "en");
}
