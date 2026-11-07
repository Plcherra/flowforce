import assert from "node:assert/strict";
import {
  compareHardcodedLiterals,
  compareLocaleKeySets,
  compareUsedTranslationKeys,
  extractHardcodedLiterals,
  extractStrictLiterals,
  extractTranslationKeys,
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

  const source = `
    export function StatusLabel(ok: boolean) {
      return ok ? "Saved" : "pending";
    }
    export function Panel() {
      return <button aria-label="Close dialog">Save</button>;
    }
    function toast(input) { return input; }
    function save() {
      const message = "Could not save";
      toast({ title: "Error", description: message });
      console.error("Failed in console");
    }
  `;
  const found = extractHardcodedLiterals(source, "src/Panel.tsx");
  assert.ok(found.some((line) => line.endsWith("Saved")), found.join("\n"));
  assert.ok(found.some((line) => line.endsWith("Close dialog")), found.join("\n"));
  assert.ok(found.some((line) => line.endsWith("Save")), found.join("\n"));
  assert.ok(found.some((line) => line.endsWith("Error")), found.join("\n"));
  assert.ok(found.some((line) => line.endsWith("Could not save")), found.join("\n"));
  assert.equal(found.some((line) => line.includes("pending")), false);
  assert.equal(found.some((line) => line.includes("console")), false);

  const missingUsed = compareUsedTranslationKeys(
    ["settings.language", "settings.missing"],
    ["settings.language"],
  );
  assert.deepEqual(missingUsed, ["missing translation key settings.missing"]);

  const strictSource = `
    const panelTitle = ready ? "Team availability" : "My availability";
    const row = { label: "Eastern (US & Canada)", code: "utc" };
    export function View() {
      return <Spinner text="Loading workspace..." />;
    }
  `;
  const strict = extractStrictLiterals(strictSource, "src/features/scheduling/View.tsx");
  assert.ok(strict.some((line) => line.endsWith("Team availability")), strict.join("\n"));
  assert.ok(strict.some((line) => line.endsWith("Eastern (US & Canada)")), strict.join("\n"));
  assert.ok(strict.some((line) => line.endsWith("Loading workspace...")), strict.join("\n"));

  const keys = extractTranslationKeys(
    `export function View(){ const t = (key) => key; return t("schedule.heading"); }`,
    "src/View.tsx",
  );
  assert.deepEqual(keys, ["schedule.heading"]);
}
