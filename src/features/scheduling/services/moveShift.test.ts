import assert from "node:assert/strict";
import { moveShift } from "./moveShift";

export async function runMoveShiftTests() {
  const shift = {
    id: "shift-1",
    start_time: "2026-07-07T14:00:00.000Z",
    end_time: "2026-07-07T22:00:00.000Z",
    assignments: [{ user_id: "user-a" }],
  } as never;

  const targetDay = new Date("2026-07-07T00:00:00.000Z");
  let updated: { start_time: string; end_time: string } | null = null;
  let assigned: string | null = null;
  let unassigned: string | null = null;

  const result = await moveShift({
    shift,
    sourceEmployeeId: "user-a",
    targetEmployeeId: "user-b",
    targetDay,
    updateSchedule: async (_id, updates) => {
      updated = updates;
      return {};
    },
    assign: async (_shiftId, userId) => {
      assigned = userId;
      return true;
    },
    unassign: async (_shiftId, userId) => {
      unassigned = userId;
      return true;
    },
    getCellAvailability: () => ({
      status: "available" as const,
      hint: undefined,
      windows: [{ start: "00:00", end: "23:59" }],
      blockers: [],
      canAssign: true,
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(unassigned, "user-a");
  assert.equal(assigned, "user-b");

  const shiftStart = new Date(shift.start_time);
  const dayMoveTarget = new Date(shiftStart);
  dayMoveTarget.setDate(dayMoveTarget.getDate() + 1);
  dayMoveTarget.setHours(0, 0, 0, 0);
  updated = null;
  const dayMoveResult = await moveShift({
    shift,
    sourceEmployeeId: "user-a",
    targetEmployeeId: "user-a",
    targetDay: dayMoveTarget,
    updateSchedule: async (_id, updates) => {
      updated = updates;
      return {};
    },
    assign: async () => true,
    unassign: async () => true,
    getCellAvailability: () => ({
      status: "available" as const,
      windows: [{ start: "00:00", end: "23:59" }],
      blockers: [],
      canAssign: true,
    }),
  });
  assert.equal(dayMoveResult.ok, true);
  assert.ok(updated, "day change updates schedule times");

  const blocked = await moveShift({
    shift,
    sourceEmployeeId: "user-a",
    targetEmployeeId: "user-b",
    targetDay,
    updateSchedule: async () => ({}),
    assign: async () => true,
    unassign: async () => true,
    getCellAvailability: () => ({
      status: "blocked" as const,
      hint: "Off",
      windows: [],
      blockers: [
        {
          kind: "outside_preference" as const,
          label: "Off",
          severity: "blocking" as const,
        },
      ],
      canAssign: false,
    }),
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.severity, "blocking");

  const noOp = await moveShift({
    shift,
    sourceEmployeeId: "user-a",
    targetEmployeeId: "user-a",
    targetDay: (() => {
      const d = new Date(shift.start_time);
      d.setHours(0, 0, 0, 0);
      return d;
    })(),
    updateSchedule: async () => ({}),
    assign: async () => true,
    unassign: async () => true,
  });

  assert.equal(noOp.noOp, true);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runMoveShiftTests().then(() => {
    console.log("moveShift tests passed");
  });
}
