import { isSameDay } from "date-fns";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { GridCellAvailability } from "@/types/platform";
import { evaluateAssignment } from "@/features/scheduling/services/availability/scheduleAvailabilityEngine";

export type ShiftsByEmployeeDay = Map<
  string,
  Map<string, ShiftWithAssignments[]>
>;

export function dayIso(day: Date): string {
  return day.toISOString().slice(0, 10);
}

export function buildShiftsByEmployeeDay(
  weekSchedules: ShiftWithAssignments[],
  weekDays: Date[],
  employeeIds: string[],
): ShiftsByEmployeeDay {
  const result: ShiftsByEmployeeDay = new Map();

  for (const employeeId of employeeIds) {
    const dayMap = new Map<string, ShiftWithAssignments[]>();
    for (const day of weekDays) {
      dayMap.set(dayIso(day), []);
    }
    result.set(employeeId, dayMap);
  }

  for (const schedule of weekSchedules) {
    const start = schedule.start_time ? new Date(schedule.start_time) : null;
    if (!start) continue;

    for (const assignment of schedule.assignments ?? []) {
      const userId = assignment.user_id;
      if (!userId) continue;
      const dayMap = result.get(userId);
      if (!dayMap) continue;

      for (const day of weekDays) {
        if (isSameDay(start, day)) {
          const key = dayIso(day);
          const list = dayMap.get(key) ?? [];
          list.push(schedule);
          dayMap.set(key, list);
          break;
        }
      }
    }
  }

  return result;
}

export function buildShiftsByDay(
  weekSchedules: ShiftWithAssignments[],
  weekDays: Date[],
): Map<string, ShiftWithAssignments[]> {
  const result = new Map<string, ShiftWithAssignments[]>();
  for (const day of weekDays) {
    result.set(dayIso(day), []);
  }

  for (const schedule of weekSchedules) {
    const start = schedule.start_time ? new Date(schedule.start_time) : null;
    if (!start) continue;
    for (const day of weekDays) {
      if (isSameDay(start, day)) {
        const key = dayIso(day);
        const list = result.get(key) ?? [];
        list.push(schedule);
        result.set(key, list);
        break;
      }
    }
  }

  return result;
}

export function buildConflictByShiftId(
  weekSchedules: ShiftWithAssignments[],
  cellAvailability: Map<string, Map<string, GridCellAvailability>>,
): Map<string, boolean> {
  const conflicts = new Map<string, boolean>();

  for (const schedule of weekSchedules) {
    if (!schedule.start_time || !schedule.end_time) {
      conflicts.set(schedule.id, false);
      continue;
    }

    const start = new Date(schedule.start_time);
    const dayKey = start.toISOString().slice(0, 10);
    let hasConflict = false;

    for (const assignment of schedule.assignments ?? []) {
      const userId = assignment.user_id;
      if (!userId) continue;
      const cell = cellAvailability.get(userId)?.get(dayKey);
      if (!cell) continue;
      const result = evaluateAssignment({
        shiftStart: new Date(schedule.start_time),
        shiftEnd: new Date(schedule.end_time),
        cell,
      });
      if (result.severity === "blocking") {
        hasConflict = true;
        break;
      }
    }

    conflicts.set(schedule.id, hasConflict);
  }

  return conflicts;
}

export const VIRTUALIZE_EMPLOYEE_THRESHOLD = 50;
export const EMPLOYEE_ROW_HEIGHT = 52;
