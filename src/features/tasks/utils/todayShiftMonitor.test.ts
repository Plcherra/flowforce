import assert from "node:assert/strict";
import { withChecklistAddress } from "@/features/forms/utils/checklistForms";
import { todayShiftProgress } from "./todayShiftMonitor";

const now = new Date(2026, 9, 23, 15, 0, 0);
const at = (hour: number, minute: number) =>
  new Date(2026, 9, 23, hour, minute, 0).toISOString();

export function runTodayShiftMonitorTests() {
  const rows = todayShiftProgress({
    now,
    schedules: [
      {
        id: "cashier-shift",
        role: "Cashier",
        title: "Cashier - Opening",
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
    ],
    forms: [
      {
        id: "open-form",
        title: "Open drawer",
        settings: withChecklistAddress(null, { area: "cashier", slot: "opening" }),
      },
      {
        id: "close-form",
        title: "Close drawer",
        settings: withChecklistAddress(null, { area: "cashier", slot: "closing" }),
      },
    ],
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
      {
        form_id: "close-form",
        submitted_at: at(21, 0),
        submitted_by: "ana",
        submission_data: { additional_information: "no coins" },
      },
    ],
  });

  const cashier = rows.find((row) => row.shiftId === "cashier-shift");
  const opening = cashier?.lists.find((list) => list.slot === "opening");
  const closing = cashier?.lists.find((list) => list.slot === "closing");
  assert.equal(opening?.done, 2);
  assert.equal(opening?.total, 3);
  assert.equal(closing?.note, "no coins");

  const cook = rows.find((row) => row.shiftId === "cook-shift");
  assert.equal(cook?.area, null);
  assert.deepEqual(cook?.lists, []);
}
