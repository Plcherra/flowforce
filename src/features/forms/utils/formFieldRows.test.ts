import assert from "node:assert/strict";
import { parseFormFieldRows } from "./formFieldRows";

export function runFormFieldRowTests() {
  const rows = parseFormFieldRows([
    {
      id: "field-1",
      form_id: "form-1",
      field_order: "1",
      field_type: "select",
      label: "Leave type",
      is_required: true,
      options: ["Vacation", "Sick", "Personal"],
      min_value: "0",
      max_value: null,
      step_value: "1",
    },
    { id: 12, label: "skipped because id is not text" },
    {
      id: "field-2",
      field_order: 2,
      field_type: "date",
      label: "Start date",
    },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.field_order, 1);
  assert.equal(rows[0]?.min_value, 0);
  assert.equal(rows[0]?.step_value, 1);
  assert.deepEqual(rows[0]?.options, ["Vacation", "Sick", "Personal"]);
  assert.equal(rows[1]?.field_type, "date");
  assert.equal(rows[1]?.field_order, 2);
}
