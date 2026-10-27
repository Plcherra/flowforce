import assert from "node:assert/strict";
import { taskContentTouches } from "@/features/tasks/taskContentFields";
import { executionContentPatch } from "./executionUpdate";

export function runExecutionUpdateTests() {
  const current = {
    title: "Restock the walk-in",
    description: "Bring the milk up front.",
  };
  const unchanged = executionContentPatch(current, {
    title: "Restock the walk-in",
    description: "Bring the milk up front.",
  });
  assert.deepEqual(unchanged, {});
  assert.equal(taskContentTouches(unchanged), false);

  const whitespace = executionContentPatch(
    { title: "Restock the walk-in", description: null },
    { title: "  Restock the walk-in  ", description: "   " },
  );
  assert.deepEqual(whitespace, {});
  assert.equal(taskContentTouches(whitespace), false);

  const titleEdit = executionContentPatch(current, {
    title: "Restock the fridge",
    description: current.description,
  });
  assert.deepEqual(titleEdit, { title: "Restock the fridge" });
  assert.equal(taskContentTouches(titleEdit), true);

  const cleared = executionContentPatch(current, {
    title: current.title,
    description: "",
  });
  assert.deepEqual(cleared, { description: null });
  assert.equal(taskContentTouches(cleared), true);
}
