import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";
import type {
  TimeOffWithUser,
  UnavailabilityWithUser,
} from "@/features/scheduling/hooks/types";
import type {
  AssignmentValidationResult,
  AvailabilityBlockerKind,
  GridCellAvailability,
} from "@/types/platform";
import {
  TERMINAL_TIME_OFF_STATUSES,
  SCHEDULE_DAY_END_MINUTES,
  SCHEDULE_DAY_START_MINUTES,
  calendarDayWithinRange,
  dateOnlyEnd,
  dateOnlyStart,
  dayOfWeekIndex,
  formatHintUntil,
  isoWeekStartForDate,
  minutesToHHmm,
  parseTimeToMinutes,
  rangesOverlap,
  shiftFitsWindows,
  toIsoDate,
} from "@/features/scheduling/utils/timeWindows";

export type ResolvedDayWindows = {
  windows: { start: string; end: string }[];
  blockers: GridCellAvailability["blockers"];
};

export type ResolveEmployeeDayWindowsInput = {
  userId: string;
  day: Date;
  staffAvailability: StaffAvailabilityRow[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
};

function preferenceWindowsForDay(
  userId: string,
  day: Date,
  staffAvailability: StaffAvailabilityRow[],
) {
  const weekStart = isoWeekStartForDate(day);
  const dayIndex = dayOfWeekIndex(day);

  return staffAvailability
    .filter(
      (row) =>
        row.user_id === userId &&
        row.week_start_date === weekStart &&
        row.day_of_week === dayIndex,
    )
    .map((row) => ({
      start: minutesToHHmm(parseTimeToMinutes(row.start_time)),
      end: minutesToHHmm(parseTimeToMinutes(row.end_time)),
    }))
    .filter(
      (window) =>
        parseTimeToMinutes(window.end) > parseTimeToMinutes(window.start),
    )
    .sort(
      (a, b) =>
        parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start),
    );
}

function subtractInterval(
  windows: { start: string; end: string }[],
  blockStartMinutes: number,
  blockEndMinutes: number,
) {
  const next: { start: string; end: string }[] = [];

  for (const window of windows) {
    const start = parseTimeToMinutes(window.start);
    const end = parseTimeToMinutes(window.end);

    if (blockEndMinutes <= start || blockStartMinutes >= end) {
      next.push(window);
      continue;
    }

    if (blockStartMinutes > start) {
      next.push({
        start: window.start,
        end: minutesToHHmm(blockStartMinutes),
      });
    }

    if (blockEndMinutes < end) {
      next.push({
        start: minutesToHHmm(blockEndMinutes),
        end: window.end,
      });
    }
  }

  return next.filter(
    (window) =>
      parseTimeToMinutes(window.end) > parseTimeToMinutes(window.start),
  );
}

export function resolveEmployeeDayWindows(
  input: ResolveEmployeeDayWindowsInput,
): ResolvedDayWindows {
  const { userId, day, staffAvailability, timeOff, unavailability } = input;
  const blockers: GridCellAvailability["blockers"] = [];
  let windows = preferenceWindowsForDay(userId, day, staffAvailability);

  if (windows.length === 0) {
    blockers.push({
      kind: "outside_preference",
      label: "Off",
      severity: "blocking",
    });
    return { windows: [], blockers };
  }

  for (const request of timeOff) {
    if (request.user_id !== userId) continue;
    const status = (request.status ?? "").toLowerCase();
    if (TERMINAL_TIME_OFF_STATUSES.has(status)) continue;

    const requestStart = dateOnlyStart(request.start_date);
    const requestEnd = dateOnlyEnd(
      request.end_date ?? request.start_date,
    );
    if (!calendarDayWithinRange(day, requestStart, requestEnd)) continue;

    if (status === "approved") {
      blockers.push({
        kind: "pto",
        label: "PTO",
        severity: "blocking",
      });
      return { windows: [], blockers };
    }

    blockers.push({
      kind: "pto",
      label: "PTO pending",
      severity: "warning",
    });
  }

  for (const entry of unavailability) {
    if (entry.user_id !== userId) continue;
    const unavailableStart = entry.start_time
      ? new Date(entry.start_time)
      : null;
    const unavailableEnd = entry.end_time ? new Date(entry.end_time) : null;
    if (!unavailableStart || !unavailableEnd) continue;

    const dayStart = dateOnlyStart(toIsoDate(day));
    const dayEnd = dateOnlyEnd(toIsoDate(day));
    if (!dayStart || !dayEnd) continue;
    if (!rangesOverlap(dayStart, dayEnd, unavailableStart, unavailableEnd)) {
      continue;
    }

    const blockStartMinutes = Math.max(
      parseTimeToMinutes(
        `${String(unavailableStart.getHours()).padStart(2, "0")}:${String(unavailableStart.getMinutes()).padStart(2, "0")}`,
      ),
      SCHEDULE_DAY_START_MINUTES,
    );
    const blockEndMinutes = Math.min(
      parseTimeToMinutes(
        `${String(unavailableEnd.getHours()).padStart(2, "0")}:${String(unavailableEnd.getMinutes()).padStart(2, "0")}`,
      ),
      SCHEDULE_DAY_END_MINUTES,
    );

    windows = subtractInterval(windows, blockStartMinutes, blockEndMinutes);
    blockers.push({
      kind: "unavailability",
      label: "Unavailable",
      severity: "blocking",
    });
  }

  return { windows, blockers };
}

export function buildGridCellPresentation(
  resolved: ResolvedDayWindows,
): GridCellAvailability {
  const { windows, blockers } = resolved;
  const hasBlockingPto = blockers.some(
    (blocker) => blocker.kind === "pto" && blocker.severity === "blocking",
  );
  const hasOffPreference = blockers.some(
    (blocker) =>
      blocker.kind === "outside_preference" && blocker.severity === "blocking",
  );

  if (hasBlockingPto || hasOffPreference || windows.length === 0) {
    const label = hasBlockingPto
      ? "PTO"
      : hasOffPreference
        ? "Off"
        : "Unavailable";
    return {
      status: "blocked",
      windows: [],
      blockers,
      canAssign: false,
      hint: label,
    };
  }

  const latestEnd = Math.max(
    ...windows.map((window) => parseTimeToMinutes(window.end)),
  );
  const earliestStart = Math.min(
    ...windows.map((window) => parseTimeToMinutes(window.start)),
  );
  const coversFullDay =
    earliestStart <= SCHEDULE_DAY_START_MINUTES &&
    latestEnd >= SCHEDULE_DAY_END_MINUTES;

  const hint =
    !coversFullDay && latestEnd < SCHEDULE_DAY_END_MINUTES
      ? formatHintUntil(latestEnd)
      : undefined;

  const hasPendingPto = blockers.some(
    (blocker) => blocker.kind === "pto" && blocker.severity === "warning",
  );

  return {
    status: coversFullDay ? "available" : "partial",
    windows,
    blockers,
    canAssign: true,
    hint: hasPendingPto && !hint ? "PTO pending" : hint,
  };
}

export function evaluateAssignment(params: {
  shiftStart: Date;
  shiftEnd: Date;
  cell: GridCellAvailability;
}): AssignmentValidationResult {
  const { shiftStart, shiftEnd, cell } = params;
  const reasons: string[] = [];

  if (cell.status === "blocked" || !cell.canAssign) {
    reasons.push(
      cell.hint
        ? `Employee is unavailable (${cell.hint}).`
        : "Employee is unavailable for this day.",
    );
    return { allowed: false, severity: "blocking", reasons };
  }

  const shiftStartMinutes =
    shiftStart.getHours() * 60 + shiftStart.getMinutes();
  const shiftEndMinutes = shiftEnd.getHours() * 60 + shiftEnd.getMinutes();

  if (!shiftFitsWindows(shiftStartMinutes, shiftEndMinutes, cell.windows)) {
    const availabilityHint =
      cell.hint ??
      (cell.windows.length > 0
        ? formatHintUntil(
            Math.max(
              ...cell.windows.map((window) =>
                parseTimeToMinutes(window.end),
              ),
            ),
          )
        : "Unavailable");
    reasons.push(
      `Shift ends ${minutesToHHmm(shiftEndMinutes)}, ${availabilityHint.toLowerCase()}.`,
    );
    return { allowed: false, severity: "blocking", reasons };
  }

  const pendingPto = cell.blockers.some(
    (blocker) => blocker.kind === "pto" && blocker.severity === "warning",
  );
  if (pendingPto) {
    reasons.push("Employee has pending PTO on this day.");
    return { allowed: true, severity: "warning", reasons };
  }

  return { allowed: true, severity: "ok", reasons: [] };
}

export function buildCellAvailabilityMap(params: {
  employeeIds: string[];
  weekDays: Date[];
  staffAvailability: StaffAvailabilityRow[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
}) {
  const map = new Map<string, Map<string, GridCellAvailability>>();

  for (const employeeId of params.employeeIds) {
    const dayMap = new Map<string, GridCellAvailability>();
    for (const day of params.weekDays) {
      const resolved = resolveEmployeeDayWindows({
        userId: employeeId,
        day,
        staffAvailability: params.staffAvailability,
        timeOff: params.timeOff,
        unavailability: params.unavailability,
      });
      dayMap.set(toIsoDate(day), buildGridCellPresentation(resolved));
    }
    map.set(employeeId, dayMap);
  }

  return map;
}

export type { AvailabilityBlockerKind };
