import assert from "node:assert/strict";
import {
  groupGridRows,
  personStoreAndRole,
} from "./scheduleGridGroups";

function people(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `p-${index}`,
    store: index % 2 === 0 ? "High street" : "Mall",
    role: index % 3 === 0 ? "Barista" : "Cook",
  }));
}

export function runScheduleGridGroupsTests() {
  for (const count of [25, 50, 100, 500]) {
    const rows = groupGridRows(people(count), new Set());
    assert.ok(rows.some((row) => row.kind === "section"), `${count} has sections`);
    assert.equal(
      rows.filter((row) => row.kind === "employee").length,
      count,
    );
  }

  const collapsed = groupGridRows(people(25), new Set(["High street\0Barista"]));
  assert.equal(
    collapsed.some(
      (row) => row.kind === "employee" && row.employee.store === "High street" && row.employee.role === "Barista",
    ),
    false,
  );
  assert.equal(groupGridRows(people(24), new Set()).every((row) => row.kind === "employee"), true);

  assert.deepEqual(
    personStoreAndRole([
      { location: "High street", role: "Barista" },
      { location: "High street", role: "Barista" },
      { location: "Mall", role: "Cook" },
    ]),
    { store: "High street", role: "Barista" },
  );
  assert.deepEqual(personStoreAndRole([]), { store: "No store", role: "No role" });
}
