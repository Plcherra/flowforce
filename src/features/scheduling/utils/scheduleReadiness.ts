import type {
  ShiftWithAssignments,
  TimeOffWithUser,
  UnavailabilityWithUser,
} from "@/features/scheduling/hooks/types";
import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";
import { evaluateShiftAssignment } from "@/features/scheduling/services/availability/evaluateShiftAssignment";
import {
  dateValue,
  rangesOverlap,
  TERMINAL_TIME_OFF_STATUSES,
  dateOnlyEnd,
  dateOnlyStart,
} from "@/features/scheduling/utils/timeWindows";

export type ScheduleConflict = {
  id: string;
  shiftId: string;
  type: "time_off" | "unavailability" | "overlap" | "availability";
  severity: "warning" | "blocking";
  message: string;
};

export type ScheduleReadinessSummary = {
  shiftCount: number;
  draftCount: number;
  unassignedCount: number;
  understaffedCount: number;
  conflictCount: number;
  blockingConflictCount: number;
  scheduledLaborHours: number;
  scheduledLaborCost: number;
  missingRateCount: number;
  conflicts: ScheduleConflict[];
};

function getShiftWindow(shift: ShiftWithAssignments) {
  return {
    start: dateValue(shift.start_time),
    end: dateValue(shift.end_time),
  };
}

function getAssignedUserIds(shift: ShiftWithAssignments) {
  const ids = new Set<string>();
  if (shift.user_id) ids.add(shift.user_id);
  for (const assignment of shift.assignments ?? []) {
    if (assignment.user_id) ids.add(assignment.user_id);
  }
  return Array.from(ids);
}

export function getShiftLaborHours(shift: ShiftWithAssignments) {
  const { start, end } = getShiftWindow(shift);
  if (!start || !end) return 0;
  const gross = Math.max((end.getTime() - start.getTime()) / 3_600_000, 0);
  const breakHours = Math.max(shift.break_minutes ?? 0, 0) / 60;
  const net = Math.max(gross - breakHours, 0);
  return net * Math.max(shift.required_headcount ?? 1, 1);
}

export function buildShiftConflictWarnings(params: {
  shift: ShiftWithAssignments;
  shifts: ShiftWithAssignments[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  staffAvailability?: StaffAvailabilityRow[];
  assignedUserIds?: string[];
}): ScheduleConflict[] {
  const { shift, shifts, timeOff, unavailability, staffAvailability = [] } =
    params;
  const assignedUserIds = params.assignedUserIds ?? getAssignedUserIds(shift);
  const assignedUserIdSet = new Set(assignedUserIds);
  const { start, end } = getShiftWindow(shift);
  const conflicts: ScheduleConflict[] = [];

  if (!start || !end || assignedUserIds.length === 0) {
    return conflicts;
  }

  if (staffAvailability.length > 0) {
    for (const userId of assignedUserIds) {
      const validation = evaluateShiftAssignment({
        userId,
        shiftStart: start,
        shiftEnd: end,
        staffAvailability,
        timeOff,
        unavailability,
      });

      if (validation.severity === "ok") continue;

      conflicts.push({
        id: `${shift.id}:availability:${userId}`,
        shiftId: shift.id,
        type: "availability",
        severity:
          validation.severity === "blocking" ? "blocking" : "warning",
        message:
          validation.reasons.join(" ") ||
          "Assigned teammate is unavailable for this shift.",
      });
    }
  } else {
    for (const request of timeOff) {
      if (!request.user_id || !assignedUserIdSet.has(request.user_id)) continue;
      const status = (request.status ?? "").toLowerCase();
      if (TERMINAL_TIME_OFF_STATUSES.has(status)) continue;
      const requestStart = dateOnlyStart(request.start_date);
      const requestEnd = dateOnlyEnd(
        request.end_date ?? request.start_date,
      );
      if (!rangesOverlap(start, end, requestStart, requestEnd)) continue;

      conflicts.push({
        id: `${shift.id}:time_off:${request.id}`,
        shiftId: shift.id,
        type: "time_off",
        severity: status === "approved" ? "blocking" : "warning",
        message: `Assigned teammate has ${status || "pending"} time off during this shift.`,
      });
    }

    for (const entry of unavailability) {
      if (!entry.user_id || !assignedUserIdSet.has(entry.user_id)) continue;
      const unavailableStart = dateValue(entry.start_time);
      const unavailableEnd = dateValue(entry.end_time);
      if (!rangesOverlap(start, end, unavailableStart, unavailableEnd)) continue;

      conflicts.push({
        id: `${shift.id}:unavailability:${entry.id}`,
        shiftId: shift.id,
        type: "unavailability",
        severity: "blocking",
        message: "Assigned teammate is unavailable during this shift.",
      });
    }
  }

  for (const otherShift of shifts) {
    if (otherShift.id === shift.id) continue;
    const otherAssigned = getAssignedUserIds(otherShift);
    if (!otherAssigned.some((userId) => assignedUserIdSet.has(userId))) {
      continue;
    }
    const otherWindow = getShiftWindow(otherShift);
    if (!rangesOverlap(start, end, otherWindow.start, otherWindow.end)) {
      continue;
    }

    conflicts.push({
      id: `${shift.id}:overlap:${otherShift.id}`,
      shiftId: shift.id,
      type: "overlap",
      severity: "blocking",
      message: "Assigned teammate is also scheduled on another overlapping shift.",
    });
  }

  return conflicts;
}

export function buildScheduleReadinessSummary(params: {
  shifts: ShiftWithAssignments[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  staffAvailability?: StaffAvailabilityRow[];
}): ScheduleReadinessSummary {
  const { shifts, timeOff, unavailability, staffAvailability = [] } = params;
  const conflicts = shifts.flatMap((shift) =>
    buildShiftConflictWarnings({
      shift,
      shifts,
      timeOff,
      unavailability,
      staffAvailability,
    }),
  );
  const uniqueConflictIds = new Set(conflicts.map((conflict) => conflict.id));
  const uniqueConflicts = conflicts.filter((conflict) => {
    if (!uniqueConflictIds.has(conflict.id)) return false;
    uniqueConflictIds.delete(conflict.id);
    return true;
  });

  const scheduledLaborHours = shifts.reduce(
    (sum, shift) => sum + getShiftLaborHours(shift),
    0,
  );

  const scheduledLaborCost = shifts.reduce((sum, shift) => {
    const rate = Number(shift.hourly_rate ?? 0);
    if (!Number.isFinite(rate) || rate <= 0) return sum;
    return sum + getShiftLaborHours(shift) * rate;
  }, 0);

  return {
    shiftCount: shifts.length,
    draftCount: shifts.filter((shift) => shift.is_published !== true).length,
    unassignedCount: shifts.filter(
      (shift) => getAssignedUserIds(shift).length === 0,
    ).length,
    understaffedCount: shifts.filter((shift) => {
      const assigned = getAssignedUserIds(shift).length;
      const required = Math.max(shift.required_headcount ?? 1, 1);
      return assigned < required;
    }).length,
    conflictCount: uniqueConflicts.length,
    blockingConflictCount: uniqueConflicts.filter(
      (conflict) => conflict.severity === "blocking",
    ).length,
    scheduledLaborHours,
    scheduledLaborCost,
    missingRateCount: shifts.filter(
      (shift) => !shift.hourly_rate || shift.hourly_rate <= 0,
    ).length,
    conflicts: uniqueConflicts,
  };
}
