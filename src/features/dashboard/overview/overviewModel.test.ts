import assert from "node:assert/strict";
import { withFormDistribution } from "@/features/forms/utils/formDistribution";
import { emptyTaskAudience } from "@/features/tasks/utils/taskAudience";
import {
  coverageSummary,
  overviewWidgets,
  rollupLists,
} from "./overviewModel";

const NOW = new Date(2026, 10, 7, 15, 0, 0);

function listSettings(dueAt: string | null) {
  return withFormDistribution(null, {
    recordKind: "list",
    roleIds: ["cashier"],
    fillAudience: emptyTaskAudience("company"),
    seeAudience: emptyTaskAudience("company"),
    showFrom: "2026-11-07T08:00:00.000Z",
    dueAt,
  });
}

export function runOverviewModelTests() {
  assert.deepEqual(overviewWidgets({ leadership: false }), [
    "myShift",
    "myLists",
    "companyUpdates",
  ]);
  assert.deepEqual(
    overviewWidgets({
      leadership: true,
      packs: { team: false, insights: false, stock: false },
    }),
    ["myShift", "myLists", "companyUpdates", "coverage", "listStatus"],
  );
  assert.deepEqual(
    overviewWidgets({
      leadership: true,
      packs: { team: true, insights: true, stock: true },
    }),
    ["myShift", "myLists", "companyUpdates", "coverage", "listStatus"],
  );
  assert.equal(
    overviewWidgets({ leadership: false }).includes("coverage"),
    false,
  );

  assert.deepEqual(
    coverageSummary([
      { user_id: "a", is_published: true, is_template: false },
      { user_id: null, is_published: true, is_template: false },
      { user_id: null, is_published: false, is_template: false },
      { user_id: "b", is_published: true, is_template: true },
    ]),
    { filled: 1, open: 1, total: 2 },
  );

  const due = new Date(NOW);
  due.setHours(9, 0, 0, 0);
  const later = new Date(NOW);
  later.setHours(18, 0, 0, 0);
  const rollup = rollupLists({
    now: NOW,
    forms: [
      { id: "overdue", settings: listSettings(due.toISOString()), status: "published" },
      { id: "done", settings: listSettings(due.toISOString()), status: "published" },
      { id: "later", settings: listSettings(later.toISOString()), status: "published" },
      { id: "draft", settings: listSettings(due.toISOString()), status: "draft" },
    ],
    submissions: [
      { form_id: "done", submitted_at: NOW.toISOString() },
    ],
  });
  assert.deepEqual(rollup, { overdue: 1, completed: 1 });
}
