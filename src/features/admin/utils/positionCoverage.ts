/**
 * Utility functions for position coverage
 */

import type { PositionCoverage } from "../types/userManagement";

/**
 * Calculate position coverage
 */
export function calculatePositionCoverage(
  positions: Array<{ id: string; name: string; role: string | null }>,
  assignments: Array<{ position_id: string; employee_id?: string }>,
): PositionCoverage[] {
  return positions.map((position) => {
    const employees = assignments.filter(
      (assignment) => assignment.position_id === position.id,
    ).length;
    return {
      id: position.id,
      name: position.name,
      role: position.role,
      employees,
    };
  });
}
