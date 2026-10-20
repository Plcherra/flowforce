import assert from "node:assert/strict";
import { dueDateFromShiftEnd, readScheduleTaskLink } from "./scheduleTaskLink";

export function runScheduleTaskLinkTests() {
  const linked = readScheduleTaskLink({
    source: "schedule",
    links: { schedule_id: "sched-1", shift_title: "Opening" },
  });
  assert.deepEqual(linked, {
    scheduleId: "sched-1",
    shiftTitle: "Opening",
    href: "/app/enhanced-scheduling?shift=sched-1",
  });

  assert.equal(
    readScheduleTaskLink({
      source: "manual",
      links: { schedule_id: "sched-1", shift_title: "Opening" },
    }),
    null,
  );
  assert.equal(
    readScheduleTaskLink({
      title: "Count the till",
      source: null,
      links: null,
    }),
    null,
  );
  assert.equal(
    readScheduleTaskLink({
      source: "schedule",
      links: { schedule_id: "  ", shift_title: "Opening" },
    }),
    null,
  );
  assert.equal(
    readScheduleTaskLink({
      source: "schedule",
      links: ["sched-1"],
    }),
    null,
  );
  assert.equal(
    readScheduleTaskLink({
      source: "schedule",
      links: "sched-1",
    }),
    null,
  );
  assert.equal(readScheduleTaskLink({ source: "schedule", links: null }), null);
  assert.equal(readScheduleTaskLink(null), null);

  const untitled = readScheduleTaskLink({
    source: "schedule",
    links: { schedule_id: " sched-2 ", shift_title: "   " },
  });
  assert.equal(untitled?.scheduleId, "sched-2");
  assert.equal(untitled?.shiftTitle, "Shift");
  assert.equal(untitled?.href, "/app/enhanced-scheduling?shift=sched-2");

  const missingTitle = readScheduleTaskLink({
    source: "schedule",
    links: { schedule_id: "sched-3", shift_title: 12 },
  });
  assert.equal(missingTitle?.shiftTitle, "Shift");

  const localOvernight = new Date(2026, 6, 8, 1, 15, 0);
  assert.equal(dueDateFromShiftEnd(localOvernight.toISOString()), "2026-07-08");

  const utcSlice = localOvernight.toISOString().slice(0, 10);
  if (utcSlice !== "2026-07-08") {
    assert.notEqual(dueDateFromShiftEnd(localOvernight.toISOString()), utcSlice);
  }

  assert.equal(dueDateFromShiftEnd(null), null);
  assert.equal(dueDateFromShiftEnd(undefined), null);
  assert.equal(dueDateFromShiftEnd(""), null);
  assert.equal(dueDateFromShiftEnd("   "), null);
  assert.equal(dueDateFromShiftEnd("not-a-date"), null);
}
