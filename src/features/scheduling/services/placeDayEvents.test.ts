import assert from "node:assert/strict";
import { dayIso } from "@/features/scheduling/utils/gridIndexes";
import {
  chosenShiftIds,
  eventShowsOnShift,
  groupEventsByDay,
  placeEventsOnDayShifts,
} from "./placeDayEvents";

export function runPlaceDayEventsTests() {
  const monday = new Date(2026, 9, 19, 0, 0, 0, 0);
  const tuesday = new Date(2026, 9, 20, 0, 0, 0, 0);
  const wednesday = new Date(2026, 9, 21, 0, 0, 0, 0);
  const shifts = [
    { id: "a", start: new Date(2026, 9, 19, 9, 0) },
    { id: "b", start: new Date(2026, 9, 19, 14, 0) },
    { id: "c", start: new Date(2026, 9, 20, 9, 0) },
  ];
  const open = {
    id: "open",
    start: new Date(2026, 9, 19, 11, 0),
    chosen: [] as string[],
  };
  const chosen = {
    id: "chosen",
    start: new Date(2026, 9, 19, 11, 0),
    chosen: ["a"],
  };
  const orphan = {
    id: "orphan",
    start: new Date(2026, 9, 19, 11, 0),
    chosen: ["moved-away"],
  };
  const emptyDay = {
    id: "empty",
    start: new Date(2026, 9, 21, 11, 0),
    chosen: [] as string[],
  };

  const placed = placeEventsOnDayShifts({
    events: [open, chosen, orphan, emptyDay],
    shifts,
    days: [monday, tuesday, wednesday],
    eventStart: (event) => event.start,
    chosenShiftIds: (event) => event.chosen,
  });

  assert.deepEqual(
    placed.byShift.get("a")?.map((event) => event.id),
    ["open", "chosen"],
  );
  assert.deepEqual(
    placed.byShift.get("b")?.map((event) => event.id),
    ["open"],
  );
  assert.equal(placed.byShift.has("c"), false);
  assert.deepEqual(
    placed.looseByDay.get(dayIso(monday))?.map((event) => event.id),
    ["orphan"],
  );
  assert.deepEqual(
    placed.looseByDay.get(dayIso(wednesday))?.map((event) => event.id),
    ["empty"],
  );
  assert.equal(placed.looseByDay.has(dayIso(tuesday)), false);

  assert.deepEqual(
    chosenShiftIds({ related_shift_ids: ["a", "a", "b"], shift_id: "z" }),
    ["a", "b"],
  );
  assert.deepEqual(chosenShiftIds({ shift_id: "z" }), ["z"]);
  assert.deepEqual(chosenShiftIds({}), []);

  const mondayShift = {
    id: "a",
    start_time: new Date(2026, 9, 19, 9, 0).toISOString(),
  };
  assert.equal(
    eventShowsOnShift(
      {
        start_time: new Date(2026, 9, 19, 11, 0).toISOString(),
        related_shift_ids: ["a"],
      },
      mondayShift,
    ),
    true,
  );
  assert.equal(
    eventShowsOnShift(
      {
        start_time: new Date(2026, 9, 19, 11, 0).toISOString(),
        related_shift_ids: ["b"],
      },
      mondayShift,
    ),
    false,
  );
  assert.equal(
    eventShowsOnShift(
      { start_time: new Date(2026, 9, 20, 11, 0).toISOString() },
      mondayShift,
    ),
    false,
  );

  const grouped = groupEventsByDay(
    [open, chosen, orphan, emptyDay],
    (event) => event.start,
  );
  assert.deepEqual(
    grouped.get(dayIso(monday))?.map((event) => event.id),
    ["open", "chosen", "orphan"],
  );
  assert.deepEqual(
    grouped.get(dayIso(wednesday))?.map((event) => event.id),
    ["empty"],
  );
  assert.equal(grouped.has(dayIso(tuesday)), false);
}
