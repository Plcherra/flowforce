import { isSameDay } from "date-fns";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { GridCellAvailability } from "@/types/platform";
import { evaluateAssignment } from "@/features/scheduling/services/availability/scheduleAvailabilityEngine";

export interface MoveShiftParams {
  shift: ShiftWithAssignments;
  sourceEmployeeId?: string | null;
  targetEmployeeId?: string | null;
  targetDay: Date;
  updateSchedule: (
    id: string,
    updates: { start_time: string; end_time: string },
  ) => Promise<unknown>;
  assign: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  getCellAvailability?: (
    employeeId: string,
    day: Date,
  ) => GridCellAvailability | undefined;
}

export interface MoveShiftResult {
  ok: boolean;
  severity: "ok" | "warning" | "blocking";
  reasons: string[];
  noOp?: boolean;
}

function reanchorTimes(
  shift: ShiftWithAssignments,
  targetDay: Date,
): { start: Date; end: Date } | null {
  if (!shift.start_time || !shift.end_time) return null;
  const oldStart = new Date(shift.start_time);
  const oldEnd = new Date(shift.end_time);
  const start = new Date(targetDay);
  start.setHours(
    oldStart.getHours(),
    oldStart.getMinutes(),
    oldStart.getSeconds(),
    0,
  );
  const end = new Date(targetDay);
  end.setHours(oldEnd.getHours(), oldEnd.getMinutes(), oldEnd.getSeconds(), 0);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

export async function moveShift(params: MoveShiftParams): Promise<MoveShiftResult> {
  const {
    shift,
    sourceEmployeeId,
    targetEmployeeId,
    targetDay,
    updateSchedule,
    assign,
    unassign,
    getCellAvailability,
  } = params;

  const times = reanchorTimes(shift, targetDay);
  if (!times) {
    return { ok: false, severity: "blocking", reasons: ["Invalid shift times"] };
  }

  const oldStart = shift.start_time ? new Date(shift.start_time) : null;
  const dayChanged = oldStart ? !isSameDay(oldStart, targetDay) : true;
  const employeeChanged =
    (sourceEmployeeId ?? null) !== (targetEmployeeId ?? null);

  if (!dayChanged && !employeeChanged) {
    return { ok: true, severity: "ok", reasons: [], noOp: true };
  }

  let severity: MoveShiftResult["severity"] = "ok";
  const reasons: string[] = [];

  if (targetEmployeeId && getCellAvailability) {
    const cell = getCellAvailability(targetEmployeeId, targetDay);
    if (cell) {
      const validation = evaluateAssignment({
        shiftStart: times.start,
        shiftEnd: times.end,
        cell,
      });
      if (validation.severity === "blocking") {
        return {
          ok: false,
          severity: "blocking",
          reasons: validation.reasons.length
            ? validation.reasons
            : ["Employee is unavailable for this shift."],
        };
      }
      if (validation.severity === "warning") {
        severity = "warning";
        reasons.push(
          ...validation.reasons,
          ...(validation.reasons.length
            ? []
            : ["Employee has a scheduling conflict."]),
        );
      }
    }
  }

  if (dayChanged) {
    await updateSchedule(shift.id, {
      start_time: times.start.toISOString(),
      end_time: times.end.toISOString(),
    });
  }

  if (employeeChanged) {
    if (sourceEmployeeId) {
      await unassign(shift.id, sourceEmployeeId);
    }
    if (targetEmployeeId) {
      const assigned = await assign(shift.id, targetEmployeeId, "assigned");
      if (!assigned) {
        return {
          ok: false,
          severity: "blocking",
          reasons: ["Assignment blocked by availability rules."],
        };
      }
    }
  }

  return { ok: true, severity, reasons };
}
