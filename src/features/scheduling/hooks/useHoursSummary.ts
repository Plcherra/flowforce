/**
 * Hook for calculating hours summary and coverage
 */

import { useMemo } from "react";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { AssignmentWithUser } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import {
  calculateHoursSummary,
  calculateCoveragePercentages,
} from "../utils/hoursCalculation";
import { processDailyHours } from "../utils/dailyHours";
import { filterShiftsByLocation } from "../utils/locationFilter";

interface UseHoursSummaryProps {
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  locationFilter?: string;
}

export function useHoursSummary({
  shifts,
  assignments,
  locationFilter,
}: UseHoursSummaryProps) {
  const filteredShifts = useMemo(() => {
    if (!locationFilter) return shifts;
    return filterShiftsByLocation(shifts as any, locationFilter) as ShiftWithAssignments[];
  }, [shifts, locationFilter]);

  const hoursSummary = useMemo(
    () => calculateHoursSummary(filteredShifts as ShiftWithAssignments[], assignments),
    [filteredShifts, assignments],
  );

  const coveragePercentages = useMemo(
    () => calculateCoveragePercentages(hoursSummary),
    [hoursSummary],
  );

  const dailyHourEntries = useMemo(
    () => processDailyHours(hoursSummary.dailyHours),
    [hoursSummary.dailyHours],
  );

  return {
    hoursSummary,
    coveragePercentages,
    dailyHourEntries,
  };
}
