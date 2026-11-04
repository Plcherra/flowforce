import assert from "node:assert/strict";
import {
  mergeFormEditorLayout,
  readFormEditorLayout,
  splitFieldsByLayout,
} from "./formEditorLayout";

export function runFormEditorLayoutTests() {
  const saved = mergeFormEditorLayout(
    { contentSourceLocale: "en", checklist: { area: "cashier", slot: "opening" } },
    {
      ownerOnly: true,
      sections: [
        { title: "Opening", fieldCount: 2 },
        { title: "Close", fieldCount: 1 },
      ],
    },
  );
  assert.equal(saved.contentSourceLocale, "en");
  assert.deepEqual(saved.checklist, { area: "cashier", slot: "opening" });
  assert.equal(readFormEditorLayout(saved).ownerOnly, true);
  const groups = splitFieldsByLayout(["a", "b", "c"], readFormEditorLayout(saved).sections);
  assert.deepEqual(groups, [
    { title: "Opening", fields: ["a", "b"] },
    { title: "Close", fields: ["c"] },
  ]);
  assert.deepEqual(splitFieldsByLayout(["a", "b"], [{ title: "Opening", fieldCount: 1 }]), [
    { title: "", fields: ["a", "b"] },
  ]);
}
