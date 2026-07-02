import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";
import type {
  TimeOffWithUser,
  UnavailabilityWithUser,
} from "@/features/scheduling/hooks/types";
import {
  buildGridCellPresentation,
  evaluateAssignment,
  resolveEmployeeDayWindows,
} from "@/features/scheduling/services/availability/scheduleAvailabilityEngine";
import type { AssignmentValidationResult } from "@/types/platform";

export function evaluateShiftAssignment(input: {
  userId: string;
  shiftStart: Date;
  shiftEnd: Date;
  staffAvailability: StaffAvailabilityRow[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
}): AssignmentValidationResult {
  const resolved = resolveEmployeeDayWindows({
    userId: input.userId,
    day: input.shiftStart,
    staffAvailability: input.staffAvailability,
    timeOff: input.timeOff,
    unavailability: input.unavailability,
  });
  const cell = buildGridCellPresentation(resolved);
  return evaluateAssignment({
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    cell,
  });
}

export type AssignScheduleValidationResult = {
  success: boolean;
  allowed?: boolean;
  assignment_id?: string;
  severity?: "ok" | "warning" | "blocking";
  reasons?: string[];
};

export type PublishWeekValidationResult = {
  success: boolean;
  is_published?: boolean;
  blocking_count?: number;
  conflicts?: Array<{
    schedule_id: string;
    user_id: string;
    severity?: string;
    reasons?: string[];
  }>;
};
