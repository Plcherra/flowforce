import assert from "node:assert/strict";
import { templateCopyKey, templateSourceStrings, translateTemplateCopy } from "./formTemplateCopy";

export function runFormTemplateCopyTests() {
  const missing = templateSourceStrings().filter((text) => !templateCopyKey(text));
  assert.deepEqual(missing, []);
  assert.equal(
    translateTemplateCopy("Event Registration", (key) => `es:${key}`),
    "es:forms.tplEventRegistration",
  );
}
