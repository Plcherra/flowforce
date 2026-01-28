import { supabase } from "@/integrations/supabase/client";
import {
  evaluateEmployeeContext,
  type BadgeSuggestion,
  type CertificationSummary,
  type CopilotDecision,
  type EmployeeContext,
  type EmployeeReport,
  type PromotionSuggestion,
  type SkillMatrixEntry,
  type SkillUpdate,
  type StaffPerformanceEntry,
} from "@/server/copilot/evaluator";

export {
  evaluateEmployeeContext,
  type BadgeSuggestion,
  type CertificationSummary,
  type CopilotDecision,
  type EmployeeContext,
  type EmployeeReport,
  type PromotionSuggestion,
  type SkillMatrixEntry,
  type SkillUpdate,
  type StaffPerformanceEntry,
};

export async function evaluateEmployee(
  employeeId: string,
): Promise<CopilotDecision> {
  const { data, error } = await supabase.functions.invoke<{
    decision: CopilotDecision;
  }>("copilot-evaluate-employee", {
    body: { employeeId },
  });

  if (error) {
    throw new Error(error.message ?? "Failed to evaluate employee");
  }

  if (!data?.decision) {
    throw new Error("Invalid response from evaluation service");
  }

  return data.decision;
}

export default {
  evaluateEmployee,
  evaluateEmployeeContext,
};
