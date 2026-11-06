import assert from "node:assert/strict";
import {
  defaultFormDistribution,
  withFormDistribution,
} from "@/features/forms/utils/formDistribution";
import { todayShiftProgress } from "./todayShiftMonitor";

const now = new Date(2026, 9, 23, 15, 0, 0);
const at = (hour: number, minute: number) =>
  new Date(2026, 9, 23, hour, minute, 0).toISOString();

const ROLES = [
  { id: "role-cashier", name: "Cashier" },
  { id: "role-cook", name: "Cook" },
];

function list(id: string, title: string, roleIds: string[]) {
  return {
    id,
    title,
    status: "published",
    settings: withFormDistribution(
      {},
      { ...defaultFormDistribution(), recordKind: "list" as const, roleIds },
    ),
  };
}

export function runTodayShiftMonitorTests() {
  const rows = todayShiftProgress({
    now,
    roles: ROLES,
    schedules: [
      {
        id: "cashier-shift",
        role: "Cashier",
        title: "Cashier",
        start_time: at(14, 0),
        end_time: at(22, 0),
        user_id: "ana",
        is_published: true,
        is_template: false,
      },
      {
        id: "cook-shift",
        role: "Cook",
        title: "Cook",
        start_time: at(14, 0),
        end_time: at(22, 0),
        user_id: "bo",
        is_published: true,
        is_template: false,
      },
      {
        id: "draft-shift",
        role: "Cashier",
        title: "Draft cashier",
        start_time: at(14, 0),
        end_time: at(22, 0),
        user_id: "cy",
        is_published: false,
        is_template: false,
      },
    ],
    forms: [list("open-form", "Open drawer", ["role-cashier"]), list("cook-form", "Line list", ["role-cook"])],
    fields: [
      { id: "a", form_id: "open-form", label: "Count", field_order: 1 },
      { id: "b", form_id: "open-form", label: "Safe", field_order: 2 },
      { id: "c", form_id: "open-form", label: "Sign", field_order: 3 },
    ],
    submissions: [
      {
        form_id: "open-form",
        submitted_at: at(15, 10),
        submitted_by: "ana",
        submission_data: { a: true, b: true, c: false },
      },
    ],
  });

  assert.equal(rows.some((row) => row.shiftId === "draft-shift"), false);
  const cashier = rows.find((row) => row.shiftId === "cashier-shift");
  assert.equal(cashier?.lists.length, 1);
  assert.equal(cashier?.lists[0]?.formId, "open-form");
  assert.equal(cashier?.lists[0]?.done, 2);
  assert.equal(cashier?.lists[0]?.total, 3);
  const cook = rows.find((row) => row.shiftId === "cook-shift");
  assert.equal(cook?.lists[0]?.formId, "cook-form");
  assert.equal(cook?.lists.some((list) => list.formId === "open-form"), false);
}
