import assert from "node:assert/strict";

import {
  linkedRecordHref,
  linkedRecordType,
  readLinkedRecord,
} from "./linkedScheduleReminder";

const SHIFT_ID = "c1000000-0000-4000-8000-000000000201";
const FORM_ID = "c1000000-0000-4000-8000-000000000202";
const TASK_ID = "c1000000-0000-4000-8000-000000000203";

export function runLinkedScheduleReminderTest() {
  assert.equal(linkedRecordType("form", FORM_ID), `record.form:${FORM_ID}`);
  assert.equal(linkedRecordType("shift", SHIFT_ID), `record.shift:${SHIFT_ID}`);
  assert.equal(linkedRecordType("task", TASK_ID), "record.task");

  assert.deepEqual(readLinkedRecord({ type: `record.form:${FORM_ID}` }), {
    kind: "form",
    id: FORM_ID,
  });
  assert.deepEqual(readLinkedRecord({ type: `record.shift:${SHIFT_ID}` }), {
    kind: "shift",
    id: SHIFT_ID,
  });
  assert.deepEqual(
    readLinkedRecord({ type: "record.task", task_id: TASK_ID }),
    { kind: "task", id: TASK_ID },
  );
  assert.deepEqual(readLinkedRecord({ type: "custom", task_id: TASK_ID }), {
    kind: "task",
    id: TASK_ID,
  });
  assert.equal(
    readLinkedRecord({ type: "schedule.assignment", task_id: TASK_ID }),
    null,
  );
  assert.equal(readLinkedRecord({ type: "record.form:not-an-id" }), null);

  assert.equal(
    linkedRecordHref("shift", SHIFT_ID),
    `/app/enhanced-scheduling?shift=${SHIFT_ID}`,
  );
  assert.equal(linkedRecordHref("task", TASK_ID), `/app/tasks#task-card-${TASK_ID}`);
  assert.equal(
    linkedRecordHref("form", FORM_ID),
    `/app/forms?form=${encodeURIComponent(FORM_ID)}`,
  );
}
