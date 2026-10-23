import assert from "node:assert/strict";
import { carryClosingNotes, type AreaShift } from "./closingNotes";

const shifts: AreaShift[] = [
  {
    area: "cashier",
    slot: "opening",
    personId: "person-early",
    startsAt: "2026-10-24T08:00:00",
  },
  {
    area: "cashier",
    slot: "opening",
    personId: "person-later",
    startsAt: "2026-10-25T08:00:00",
  },
  {
    area: "supervisor",
    slot: "opening",
    personId: "supervisor-next",
    startsAt: "2026-10-24T07:00:00",
  },
];

export function runClosingNoteTests() {
  const carried = carryClosingNotes({
    area: "cashier",
    notes: ["no coins in the drawer", "  "],
    shifts,
    closingEndsAt: "2026-10-23T22:00:00",
  });
  assert.deepEqual(carried.notes, ["no coins in the drawer"]);
  assert.equal(carried.personId, "person-early");

  const clean = carryClosingNotes({
    area: "cashier",
    notes: ["", "   "],
    shifts,
    closingEndsAt: "2026-10-23T22:00:00",
  });
  assert.deepEqual(clean, { personId: null, notes: [] });
}
