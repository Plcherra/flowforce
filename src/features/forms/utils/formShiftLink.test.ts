import assert from "node:assert/strict";
import { withChecklistAddress } from "./checklistForms";
import { assignChecklistAddress } from "./assignChecklistForm";
import { formShiftLinkKeys } from "./formShiftLink";

export function runFormShiftLinkTests() {
  const opening = withChecklistAddress({ language: "en" }, { area: "cashier", slot: "opening" });
  assert.deepEqual(formShiftLinkKeys(opening), {
    areaKey: "tasks.areaCashier",
    slotKey: "tasks.openingList",
  });
  assert.equal(formShiftLinkKeys({ language: "en" }), null);

  const forms = [
    { id: "drawer", settings: opening },
    { id: "count", settings: { language: "es" } },
  ];
  const saved = assignChecklistAddress(forms, "count", { area: "cashier", slot: "opening" });
  const drawer = saved.find((row) => row.id === "drawer");
  const count = saved.find((row) => row.id === "count");
  assert.equal(formShiftLinkKeys(drawer?.settings), null);
  assert.equal(drawer?.settings.language, "en");
  assert.deepEqual(formShiftLinkKeys(count?.settings), {
    areaKey: "tasks.areaCashier",
    slotKey: "tasks.openingList",
  });
  assert.equal(count?.settings.language, "es");
}
