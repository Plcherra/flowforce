/**
 * Utility functions for aggregating copilot insights
 */

import type { CopilotInsight } from "../types/userManagement";
import { formatRoleLabel } from "@/shared/utils";

/**
 * Generate role gap insights
 */
export function generateRoleGapInsights(
  positions: Array<{
    id: string;
    name: string;
    role: string | null;
    is_active?: boolean | null;
  }>,
  assignments: Array<{ position_id: string; is_active?: boolean | null }>,
): CopilotInsight[] {
  if (!positions || positions.length === 0) return [];
  const activeAssignments = assignments.filter(
    (assignment) => assignment.is_active,
  );
  const counts = new Map<string, number>();
  activeAssignments.forEach((assignment) => {
    counts.set(
      assignment.position_id,
      (counts.get(assignment.position_id) ?? 0) + 1,
    );
  });

  return positions
    .filter((position) => position.is_active !== false)
    .filter((position) => (counts.get(position.id) ?? 0) === 0)
    .slice(0, 3)
    .map((position) => ({
      id: `role-gap-${position.id}`,
      type: "roleGap" as const,
      title: `${position.name} has no active coverage`,
      description: `Assign a team member to the ${formatRoleLabel(position.role)} track to keep coverage balanced.`,
      positionId: position.id,
    }));
}

/**
 * Generate inactive employee insights
 */
export function generateInactiveInsights(
  inactiveEmployees: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>,
): CopilotInsight[] {
  if (!inactiveEmployees.length) return [];
  return inactiveEmployees.slice(0, 3).map((employee) => ({
    id: `inactive-${employee.id}`,
    type: "inactive" as const,
    title: `${employee.first_name} ${employee.last_name} inactive`,
    description:
      "No recent activity. Consider reactivating or archiving their access.",
    employeeId: employee.id,
  }));
}

/**
 * Aggregate all insights
 */
export function aggregateInsights(
  copilotInsights: CopilotInsight[],
  roleGapInsights: CopilotInsight[],
  inactiveInsights: CopilotInsight[],
): CopilotInsight[] {
  const combined = [
    ...copilotInsights,
    ...roleGapInsights,
    ...inactiveInsights,
  ];

  const unique = new Map<string, CopilotInsight>();
  combined.forEach((insight) => {
    if (!unique.has(insight.id)) {
      unique.set(insight.id, insight);
    }
  });

  return Array.from(unique.values()).slice(0, 6);
}
