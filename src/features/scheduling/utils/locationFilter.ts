/**
 * Utility functions for location filtering
 */

/**
 * Sanitize and validate location filter
 */
export function sanitizeLocationFilter(
  locationFilter: string | undefined,
  availableLocations: string[],
): string | undefined {
  if (!locationFilter) return undefined;
  const normalized = locationFilter.toLowerCase().trim();
  return availableLocations.some((loc) => loc.toLowerCase() === normalized)
    ? locationFilter
    : undefined;
}

/**
 * Filter shifts by location
 */
export function filterShiftsByLocation(
  shifts: Array<{
    location?: string | null;
    location_id?: string;
  }>,
  locationFilter: string | undefined,
): typeof shifts {
  if (!locationFilter) return shifts;
  const filterValue = locationFilter.toLowerCase().trim();
  return shifts.filter((shift) => {
    const locationName = (shift.location ?? "").toLowerCase();
    const locationId = (shift as { location_id?: string }).location_id;
    return (
      locationName === filterValue ||
      locationName.includes(filterValue) ||
      (typeof locationId === "string" &&
        locationId.toLowerCase() === filterValue)
    );
  });
}
