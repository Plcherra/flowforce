const REASON_KEYS: Record<string, string> = {
  "Invalid shift times": "schedule.invalidShiftTimes",
  "Employee is unavailable for this shift.": "schedule.employeeUnavailableShift",
  "Employee has a scheduling conflict.": "schedule.schedulingConflict",
  "Assignment blocked by availability rules.": "schedule.assignmentBlocked",
  "Move blocked by availability rules.": "schedule.moveBlocked",
  "Employee has pending PTO on this day.": "schedule.pendingPtoDay",
  "Employee is unavailable for this day.": "schedule.employeeUnavailableDay",
};

export function translateScheduleReason(
  reason: string,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  const unavailable = /^Employee is unavailable \((.*)\)\.$/.exec(reason);
  if (unavailable) {
    return t("schedule.employeeUnavailableHint", { hint: unavailable[1] ?? "" });
  }
  const key = REASON_KEYS[reason];
  return key ? t(key) : reason;
}
