import assert from "node:assert/strict";
import { filterPickerPeople } from "./peoplePickerFilter";

const people = [
  { id: "1", name: "Ada Lopes", role: "Cashier", level: "staff" },
  { id: "2", name: "Ben Costa", role: "Supervisor", level: "manager" },
];

export function runPeoplePickerFilterTests() {
  assert.deepEqual(
    filterPickerPeople(people, "ada", null, null).map((person) => person.id),
    ["1"],
  );
  assert.deepEqual(
    filterPickerPeople(people, "", null, "manager").map((person) => person.id),
    ["2"],
  );
  assert.deepEqual(
    filterPickerPeople(people, "ben", "Cashier", null),
    [],
  );
}
