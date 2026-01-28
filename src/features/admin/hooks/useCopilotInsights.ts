/**
 * Hook for copilot insights query
 */

import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/useCan";
import { evaluateEmployee } from "@/copilot/rulesEngine";
import { logger } from "@/utils/logger";
import type { Employee } from "@/hooks/useEmployees";
import type { CopilotInsight } from "../types/userManagement";

interface UseCopilotInsightsProps {
  employeeSample: Employee[];
  employeeSampleKey: string;
}

export function useCopilotInsights({
  employeeSample,
  employeeSampleKey,
}: UseCopilotInsightsProps) {
  const { can } = useCan();

  return useQuery({
    queryKey: ["team-management", "copilot-insights", employeeSampleKey],
    enabled: can("manageUsers") && employeeSample.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const evaluations = await Promise.all(
        employeeSample.map(async (employee) => {
          try {
            const decision = await evaluateEmployee(employee.id);
            return { employee, decision };
          } catch (error) {
            logger.error("Failed to evaluate employee for Copilot insights", {
              error,
              tags: ["error"],
            });
            return null;
          }
        }),
      );

      const insights: CopilotInsight[] = [];

      evaluations.forEach((entry) => {
        if (!entry?.decision) return;
        const { employee, decision } = entry;

        if (decision.promotion) {
          const confidence = Math.round(
            (decision.promotion.confidence ?? 0) * 100,
          );
          insights.push({
            id: `promotion-${employee.id}`,
            type: "promotion",
            title: `${employee.first_name} ${employee.last_name} ready for ${decision.promotion.role}`,
            description: `${decision.promotion.rationale} (confidence ${confidence}%).`,
            employeeId: employee.id,
          });
        }

        (decision.coachingNotes ?? []).forEach((note, index) => {
          insights.push({
            id: `coaching-${employee.id}-${index}`,
            type: "coaching",
            title: `${employee.first_name} ${employee.last_name} coaching opportunity`,
            description: note,
            employeeId: employee.id,
          });
        });

        (decision.badges ?? []).forEach((badge, index) => {
          insights.push({
            id: `recognition-${employee.id}-${index}`,
            type: "coaching",
            title: `${employee.first_name} ${employee.last_name} eligible for ${badge.badgeCode}`,
            description: badge.reason,
            employeeId: employee.id,
          });
        });
      });

      return insights.slice(0, 6);
    },
  });
}
