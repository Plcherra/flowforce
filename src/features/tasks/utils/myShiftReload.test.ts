import assert from "node:assert/strict";
import { parseCompanyTasks } from "@/features/tasks/repositories/tasksRepository";
import { myShiftTasksKey } from "./myShiftReload";

const productionTask = {
  id: "81acf542-e585-4c48-b475-aa321aa94a2d",
  title: "clean downstairs",
  description: null,
  status: "todo",
  priority: "medium",
  assigned_to: null,
  created_by: "8d27003a-d24f-4d7a-a48f-3d67f86eaf7c",
  goal_id: null,
  due_date: "2026-10-19",
  estimated_hours: "0.5",
  actual_hours: null,
  attachments: null,
  completed_at: null,
  created_at: "2026-10-18T00:31:36.407774+00:00",
  links: {
    schedule_id: "08400792-125f-4264-8f15-73a7f3fd1d40",
    shift_title: "Cashier - Opening",
  },
  parent_task_id: null,
  department_id: null,
  origin_document_id: null,
  origin_event_id: null,
  tags: ["schedule", "08400792-125f-4264-8f15-73a7f3fd1d40"],
  source: "schedule",
  company_id: "107fbeaa-91c0-4f2d-ae17-8620d5e7afd1",
  updated_at: "2026-10-18T00:31:36.407774+00:00",
  workflow_id: null,
  assignedprofile: null,
  createdprofile: null,
  department: null,
  goal: null,
};

export function runMyShiftReloadTests() {
  assert.equal(myShiftTasksKey([]), myShiftTasksKey([]));
  assert.equal(myShiftTasksKey([{ id: "a" }]), myShiftTasksKey([{ id: "a" }]));
  assert.notEqual(myShiftTasksKey([{ id: "a" }]), myShiftTasksKey([{ id: "b" }]));
  assert.notEqual(
    myShiftTasksKey([{ id: "a", status: "todo" }]),
    myShiftTasksKey([{ id: "a", status: "completed" }]),
  );
  assert.notEqual(
    myShiftTasksKey([{ id: "a", status: "todo" }]),
    myShiftTasksKey([{ id: "a", status: "cancelled" }]),
  );

  const parsed = parseCompanyTasks([productionTask]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.title, "clean downstairs");
  assert.equal(parsed[0]?.estimated_hours, 0.5);
  assert.equal(parsed[0]?.assigned_to, null);
  assert.equal(parsed[0]?.goal, null);
}
