import assert from "node:assert/strict";

import { taskNotificationSchema } from "./taskNotificationsRepository";

export function runTaskNotificationSchemaTests() {
  const minimalInsertResponse = taskNotificationSchema.parse({
    user_id: "00000000-0000-4000-8000-000000000001",
    task_id: "00000000-0000-4000-8000-000000000099",
    title: "Due soon",
    message: "Prep the pastries",
    type: "task_due_soon",
    metadata: { due_date: "2026-11-27" },
    company_id: "00000000-0000-4000-8000-000000000002",
  });
  assert.equal(minimalInsertResponse.type, "task_due_soon");

  const fullRow = taskNotificationSchema.parse({
    id: "00000000-0000-4000-8000-000000000010",
    user_id: "00000000-0000-4000-8000-000000000001",
    company_id: "00000000-0000-4000-8000-000000000002",
    task_id: null,
    title: "Message",
    message: "Hello",
    type: "direct_message",
    metadata: null,
    read_at: null,
    created_at: new Date().toISOString(),
  });
  assert.equal(fullRow.task_id, null);
}

export function assertNotificationInsertIncludesCompany(
  input: Record<string, unknown>,
): void {
  assert.ok(
    typeof input.company_id === "string" && input.company_id.length > 0,
    "task notification inserts must include company_id",
  );
}