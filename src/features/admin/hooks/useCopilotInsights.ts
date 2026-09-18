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
    retry: false,
    queryFn: async () => {
      const isEdgeFunctionUnavailable = (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        return (
          message.includes("Failed to send a request to the Edge Function") ||
          message.includes("Function not found") ||
          /\b404\b/.test(message)
        );
      };

      const evaluateOne = async (employee: Employee) => {
        try {
          return {
            employee,
            decision: await evaluateEmployee(employee.id),
          };
        } catch (error) {
          if (isEdgeFunctionUnavailable(error)) {
            return "unavailable" as const;
          }
          logger.warn("Failed to evaluate employee for Copilot insights", {
            error,
          });
          return null;
        }
      };

      const first = await evaluateOne(employeeSample[0]);
      if (first === "unavailable") {
        return [] as CopilotInsight[];
      }

      const rest = await Promise.all(
        employeeSample.slice(1).map((employee) => evaluateOne(employee)),
      );
      const evaluations = [first, ...rest].filter(
        (entry): entry is { employee: Employee; decision: Awaited<ReturnType<typeof evaluateEmployee>> } =>
          Boolean(entry) && entry !== "unavailable",
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
