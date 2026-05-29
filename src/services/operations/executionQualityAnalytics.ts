export type ExecutionQualitySummaryRow = {
  company_id: string;
  total_runs: number;
  completed_runs: number;
  overdue_runs: number;
  pending_review_runs: number;
  exception_runs: number;
  critical_exception_runs: number;
  repeat_failure_runs: number;
  failed_steps: number;
  completion_rate: number | null;
  overdue_rate: number | null;
  exception_rate: number | null;
  execution_quality_score: number | null;
};

export type ExecutionQualityDailyRow = {
  company_id: string;
  metric_date: string;
  location_id: string | null;
  department_id: string | null;
  assigned_role: string;
  workflow_kind: string | null;
  template_category: string | null;
  total_runs: number;
  completed_runs: number;
  overdue_runs: number;
  pending_review_runs: number;
  exception_runs: number;
  critical_exception_runs: number;
  repeat_failure_runs: number;
  failed_steps: number;
  completed_steps: number;
  total_steps: number;
  completion_rate: number | null;
  overdue_rate: number | null;
  exception_rate: number | null;
  execution_quality_score: number | null;
};

export type ExecutionQualityCoachingRow = {
  company_id: string;
  user_id: string;
  employee_name: string | null;
  email: string | null;
  department_id: string | null;
  role_name: string;
  total_runs: number;
  completed_runs: number;
  overdue_runs: number;
  exception_runs: number;
  repeat_failure_runs: number;
  failed_steps: number;
  open_training_assignments: number;
  completion_rate: number | null;
  overdue_rate: number | null;
  exception_rate: number | null;
  execution_quality_score: number | null;
  coaching_signal:
    | "repeat_failure"
    | "exception_rate"
    | "overdue"
    | "training_followup"
    | "recognition";
  coaching_recommendation: string;
  coaching_priority: "high" | "medium" | "low";
  performance_training_context: Record<string, unknown> | null;
};

export const emptyExecutionQualitySummary: ExecutionQualitySummaryRow = {
  company_id: "",
  total_runs: 0,
  completed_runs: 0,
  overdue_runs: 0,
  pending_review_runs: 0,
  exception_runs: 0,
  critical_exception_runs: 0,
  repeat_failure_runs: 0,
  failed_steps: 0,
  completion_rate: 0,
  overdue_rate: 0,
  exception_rate: 0,
  execution_quality_score: 0,
};

export const summarizeExecutionQuality = (
  summary: ExecutionQualitySummaryRow | null,
) => summary ?? emptyExecutionQualitySummary;

export const sortExecutionQualityTrends = (
  trends: ExecutionQualityDailyRow[],
) =>
  [...trends].sort((left, right) => {
    if (left.metric_date !== right.metric_date) {
      return right.metric_date.localeCompare(left.metric_date);
    }

    return (
      (left.execution_quality_score ?? 0) - (right.execution_quality_score ?? 0)
    );
  });

export const sortExecutionQualityCoaching = (
  rows: ExecutionQualityCoachingRow[],
) => {
  const priorityRank = { high: 0, medium: 1, low: 2 };

  return [...rows].sort((left, right) => {
    if (left.coaching_priority !== right.coaching_priority) {
      return (
        priorityRank[left.coaching_priority] -
        priorityRank[right.coaching_priority]
      );
    }

    return (
      (left.execution_quality_score ?? 100) -
      (right.execution_quality_score ?? 100)
    );
  });
};
