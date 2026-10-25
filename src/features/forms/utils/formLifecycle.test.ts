import assert from "node:assert/strict";
import {
  attachableShiftForms,
  canPublishForm,
  canSubmitForm,
  shouldDiscardEmptyDraft,
} from "./formLifecycle";

export function runFormLifecycleTests() {
  assert.equal(canPublishForm(0), false);
  assert.equal(canPublishForm(3), true);
  assert.equal(canSubmitForm(0), false);
  assert.equal(canSubmitForm(1), true);
  assert.equal(
    shouldDiscardEmptyDraft({ discardIfEmpty: true, savedFieldCount: 0 }),
    true,
  );
  assert.equal(
    shouldDiscardEmptyDraft({ discardIfEmpty: true, savedFieldCount: 2 }),
    false,
  );
  assert.equal(
    shouldDiscardEmptyDraft({ discardIfEmpty: false, savedFieldCount: 0 }),
    false,
  );

  const choices = attachableShiftForms([
    { id: "draft", title: "Event Registration", status: "draft" },
    { id: "live", title: "Opening checklist", status: "published" },
    { id: "old", title: "Archived", status: "archived" },
  ]);
  assert.deepEqual(
    choices.map((form) => form.id),
    ["live"],
  );
}
