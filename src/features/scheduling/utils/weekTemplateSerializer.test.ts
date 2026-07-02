import assert from "node:assert/strict";
import { addDays, isSameDay, startOfWeek } from "date-fns";
import {
  dayIndexFromDate,
  serializeWeekToTemplate,
  templateShiftsToInsertPayloads,
  parseWeekTemplateData,
} from "./weekTemplateSerializer";

export function runWeekTemplateSerializerTests() {
  const weekStart = startOfWeek(new Date("2026-07-06"), { weekStartsOn: 1 });
  const tuesday = addDays(weekStart, 1);

  assert.equal(dayIndexFromDate(weekStart, weekStart), 0, "Monday is day 0");
  assert.equal(dayIndexFromDate(tuesday, weekStart), 1, "Tuesday is day 1");

  const serialized = serializeWeekToTemplate(
    [
      {
        id: "shift-1",
        title: "Opening",
        start_time: "2026-07-07T09:00:00.000Z",
        end_time: "2026-07-07T17:00:00.000Z",
        assignments: [{ user_id: "user-a" }],
        required_headcount: 1,
        color: "#3b82f6",
        role: "Staff",
        location: "Main",
      } as never,
    ],
    weekStart,
  );

  assert.equal(serialized.version, 1);
  assert.equal(serialized.shifts.length, 1);
  assert.equal(serialized.shifts[0]?.dayIndex, 1);
  assert.equal(serialized.metadata.total_shifts, 1);

  const roundTrip = parseWeekTemplateData(serialized);
  assert.ok(roundTrip);

  const targetWeek = startOfWeek(new Date("2026-07-13"), { weekStartsOn: 1 });
  const payloads = templateShiftsToInsertPayloads(roundTrip!, targetWeek);
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0]?.title, "Opening");
  const payloadStart = new Date(payloads[0]!.start_time);
  assert.ok(
    isSameDay(payloadStart, addDays(targetWeek, 1)),
    "shift lands on target Tuesday",
  );
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runWeekTemplateSerializerTests();
  console.log("weekTemplateSerializer tests passed");
}
