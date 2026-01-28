/**
 * Hook for calculating hours summary and coverage
 */

import { useMemo } from "react";
import type { ShiftWithAssignments } from "@/hooks/scheduling/useSchedulingConsolidated";
import type { AssignmentWithUser } from "@/hooks/scheduling/useSchedulingConsolidated";
import {
  calculateHoursSummary,
  calculateCoveragePercentages,
  type HoursSummary,
  type CoveragePercentages,
} from "../utils/hoursCalculation";
import { processDailyHours, type DailyHourEntry } from "../utils/dailyHours";
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
    return filterShiftsByLocation(shifts, locationFilter);
  }, [shifts, locationFilter]);

  const hoursSummary = useMemo(
    () => calculateHoursSummary(filteredShifts, assignments),
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
