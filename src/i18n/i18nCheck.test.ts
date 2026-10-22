import assert from "node:assert/strict";
import {
  compareHardcodedLiterals,
  compareLocaleKeySets,
} from "./i18nCheck";

export function runI18nCheckTests() {
  const missingKey = compareLocaleKeySets({
    en: ["common.save", "common.cancel"],
    es: ["common.save"],
    pt: ["common.save", "common.cancel"],
    fr: ["common.save", "common.cancel"],
    it: ["common.save", "common.cancel"],
    de: ["common.save", "common.cancel"],
  });
  assert.ok(
    missingKey.some((problem) => problem.includes("es is missing common.cancel")),
    missingKey.join("\n"),
  );

  const matchedKeys = compareLocaleKeySets({
    en: ["common.save"],
    es: ["common.save"],
    pt: ["common.save"],
    fr: ["common.save"],
    it: ["common.save"],
    de: ["common.save"],
  });
  assert.deepEqual(matchedKeys, []);

  const extraLiteral = compareHardcodedLiterals(
    ["src/App.tsx: Save changes", "src/App.tsx: Extra label"],
    ["src/App.tsx: Save changes"],
  );
  assert.ok(
    extraLiteral.some((problem) => problem.includes("new hard-coded string")),
    extraLiteral.join("\n"),
  );

  const matchedLiterals = compareHardcodedLiterals(
    ["src/App.tsx: Save changes"],
    ["src/App.tsx: Save changes"],
  );
  assert.deepEqual(matchedLiterals, []);
}
