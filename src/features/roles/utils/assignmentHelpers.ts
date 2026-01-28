/**
 * Utility functions for assignment records
 */

import type { AssignmentRecord } from "../types/permissions";

/**
 * Get employee display name from assignment record
 */
export function getEmployeeDisplayName(
  record: AssignmentRecord | null | undefined,
): string {
  const profile = record?.profile || record?.profiles;
  if (!profile) return "Pending assignment";
  const first = profile.first_name || "";
  const last = profile.last_name || "";
  const name = `${first} ${last}`.trim();
  return name || "Unnamed Employee";
}
