/**
 * Utility functions for location operations
 */

import type { ShiftWithAssignments } from "@/hooks/scheduling/useSchedulingConsolidated";

/**
 * Extract unique locations from shifts
 */
export function extractAvailableLocations(
  shifts: ShiftWithAssignments[],
): string[] {
  return Array.from(
    new Set(
      shifts
        .map((shift) => shift.location?.trim())
        .filter((location): location is string =>
          Boolean(location && location.length),
        ),
    ),
  );
}
