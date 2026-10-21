import assert from "node:assert/strict";
import { handoverTaskDraft } from "./handoverTask";

export function runHandoverTaskTests() {
  assert.equal(
    handoverTaskDraft({
      note: "   ",
      formId: "form-1",
      userId: "user-1",
      today: new Date(2026, 9, 21),
    }),
    null,
  );
  assert.equal(
    handoverTaskDraft({
      note: "place the mats",
      formId: "  ",
      userId: "user-1",
    }),
    null,
  );

  const draft = handoverTaskDraft({
    note: "place the rubber mats before opening\nmilk is in the walk-in",
    formId: "form-1",
    userId: "user-1",
    today: new Date(2026, 9, 21),
  });
  assert.ok(draft);
  assert.equal(draft?.title, "place the rubber mats before opening");
  assert.equal(
    draft?.description,
    "place the rubber mats before opening\nmilk is in the walk-in",
  );
  assert.equal(draft?.due_date, "2026-10-22");
  assert.equal(draft?.source, "form");
  assert.equal(draft?.status, "todo");
  assert.equal(draft?.assigned_to, "user-1");
  assert.deepEqual(draft?.links, { form_id: "form-1" });

  const longLine = "a".repeat(90);
  const truncated = handoverTaskDraft({
    note: longLine,
    formId: "form-1",
    userId: "user-1",
    today: new Date(2026, 9, 31),
  });
  assert.equal(truncated?.title.length, 80);
  assert.equal(truncated?.description.length, 90);
  assert.equal(truncated?.due_date, "2026-11-01");
}
