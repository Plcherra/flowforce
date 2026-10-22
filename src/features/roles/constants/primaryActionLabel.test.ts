import assert from "node:assert/strict";
import { primaryActionLabel } from "./primaryActionLabel";

export function runPrimaryActionLabelTests() {
  const withEdit = primaryActionLabel(true);
  const withoutEdit = primaryActionLabel(false);

  assert.equal(withEdit.label, "Save changes");
  assert.equal(withEdit.writesDirectly, true);
  assert.equal(withoutEdit.label, "Send request");
  assert.equal(withoutEdit.writesDirectly, false);
  assert.equal(withEdit.label === "Send availability", false);
  assert.equal(withoutEdit.label === "Send availability", false);
  assert.equal(withEdit.labelKey, "roles.primarySaveChanges");
  assert.equal(withoutEdit.labelKey, "roles.primarySendRequest");
}
