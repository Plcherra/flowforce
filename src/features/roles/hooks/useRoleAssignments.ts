/**
 * Hook for managing role assignments
 */

import { useMemo } from "react";
import type { Position, PositionAssignment } from "@/hooks/usePositions";
import type { RoleKey, AssignmentRecord } from "../types/permissions";
import { ROLE_ORDER } from "../constants/roles";
import { normalizeRoleName } from "../utils/permissionHelpers";
import { getEmployeeDisplayName } from "../utils/assignmentHelpers";

interface UseRoleAssignmentsProps {
  positions: Position[];
  assignments: PositionAssignment[];
}

export function useRoleAssignments({
  positions,
  assignments,
}: UseRoleAssignmentsProps) {
  const assignmentByRole = useMemo(() => {
    const map = new Map<
      RoleKey,
      { positions: Position[]; employees: string[] }
    >();
    ROLE_ORDER.forEach((role) =>
      map.set(role, { positions: [], employees: [] }),
    );

    positions.forEach((position) => {
      const normalized = normalizeRoleName(position.role);
      if (!normalized) return;
      const current = map.get(normalized);
      if (current) {
        current.positions.push(position);
      }
    });

    assignments.forEach((assignment) => {
      const normalized = normalizeRoleName(assignment?.position?.role);
      if (!normalized) return;
      const current = map.get(normalized);
      if (current) {
        current.employees.push(
          getEmployeeDisplayName(assignment as AssignmentRecord),
        );
      }
    });

    return map;
  }, [positions, assignments]);

  return { assignmentByRole };
}
