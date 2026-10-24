import assert from "node:assert/strict";
import { readAssigneeIds, readFormId, shiftTaskRow } from "./shiftTaskWrite";

export function runShiftTaskWriteTests() {
  const attached = shiftTaskRow({
    title: "Opening list",
    description: "",
    priority: "medium",
    estimatedMinutes: 15,
    formId: "form-1",
    assigneeIds: ["ada", "ada", "ben"],
    startsAt: "2026-10-23T14:00:00.000Z",
    endsAt: "2026-10-23T15:00:00.000Z",
    companyId: "company-1",
    createdBy: "owner-1",
    scheduleId: "shift-1",
    shiftTitle: "Cashier - Opening",
  });
  const links = attached.links as Record<string, unknown>;
  assert.equal(links.form_id, "form-1");
  assert.equal(links.schedule_id, "shift-1");
  assert.deepEqual(links.assignee_ids, ["ada", "ben"]);
  assert.equal(links.starts_at, "2026-10-23T14:00:00.000Z");
  assert.equal(links.ends_at, "2026-10-23T15:00:00.000Z");
  assert.equal(attached.assigned_to, "ada");
  assert.equal(attached.source, "schedule");

  const custom = shiftTaskRow({
    title: "Clean the restroom",
    description: "Downstairs",
    priority: "low",
    estimatedMinutes: 20,
    formId: null,
    assigneeIds: [],
    startsAt: null,
    endsAt: null,
    companyId: "company-1",
    createdBy: "owner-1",
    scheduleId: "shift-1",
    shiftTitle: "Cashier - Opening",
    fallbackDue: null,
  });
  const customLinks = custom.links as Record<string, unknown>;
  assert.equal(customLinks.form_id, null);
  assert.equal(customLinks.starts_at, null);
  assert.equal(customLinks.ends_at, null);
  assert.equal(custom.assigned_to, null);
  assert.equal(custom.due_date, null);
  assert.deepEqual(readAssigneeIds(custom.links, "ada"), ["ada"]);
  assert.equal(readFormId(attached.links), "form-1");
}
