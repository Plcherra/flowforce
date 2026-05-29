export type RecurringFrequency = "daily" | "weekly";

export type RecurringOperationsSchedulePreset = {
  id: string;
  label: string;
  description: string;
  frequency: RecurringFrequency;
  daysOfWeek?: number[];
  dueTime: string;
  startMinutesBeforeDue: number;
  overdueMinutes: number;
  assignmentType: "role" | "person" | "location";
  managerWorkloadSignal: string;
};

export type GenerateRecurringRunsResult = {
  assignments_checked?: number;
  runs_created?: number;
  step_runs_created?: number;
  start_date?: string;
  end_date?: string;
};

export type OperationsDailyWorkloadRow = {
  company_id: string;
  workload_date: string;
  total_runs: number;
  scheduled_runs: number;
  active_runs: number;
  completed_runs: number;
  overdue_runs: number;
  pending_review_runs: number;
  first_start_at: string | null;
  last_due_at: string | null;
};

export const recurringOperationsSchedulePresets: RecurringOperationsSchedulePreset[] =
  [
    {
      id: "daily-opening",
      label: "Daily opening",
      description: "Generate every active opening checklist before the shift.",
      frequency: "daily",
      dueTime: "09:00",
      startMinutesBeforeDue: 60,
      overdueMinutes: 15,
      assignmentType: "role",
      managerWorkloadSignal: "Morning readiness",
    },
    {
      id: "daily-closing",
      label: "Daily closing",
      description: "Prepare closing checklists with manager review pending.",
      frequency: "daily",
      dueTime: "22:30",
      startMinutesBeforeDue: 90,
      overdueMinutes: 20,
      assignmentType: "role",
      managerWorkloadSignal: "Closeout coverage",
    },
    {
      id: "weekly-safety",
      label: "Weekly safety",
      description: "Schedule safety inspections for Monday and Thursday.",
      frequency: "weekly",
      daysOfWeek: [1, 4],
      dueTime: "14:00",
      startMinutesBeforeDue: 120,
      overdueMinutes: 30,
      assignmentType: "person",
      managerWorkloadSignal: "Compliance rhythm",
    },
  ];

export const formatDateForRpc = (date: Date) => date.toISOString().slice(0, 10);

export const buildGenerationWindow = (daysAhead = 6) => {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + Math.max(daysAhead, 0));

  return {
    startDate: formatDateForRpc(start),
    endDate: formatDateForRpc(end),
  };
};

export const buildScheduleRule = (
  preset: RecurringOperationsSchedulePreset,
  timezone = "UTC",
) => ({
  frequency: preset.frequency,
  days_of_week: preset.daysOfWeek ?? [],
  timezone,
});

export const buildDueWindow = (
  preset: RecurringOperationsSchedulePreset,
  timezone = "UTC",
) => ({
  due_time: preset.dueTime,
  timezone,
  start_minutes_before_due: preset.startMinutesBeforeDue,
});

export const buildEscalationRule = (
  preset: RecurringOperationsSchedulePreset,
) => ({
  overdue_minutes: preset.overdueMinutes,
  notify_roles: ["manager", "owner"],
});

export const summarizeWorkload = (rows: OperationsDailyWorkloadRow[]) => {
  return rows.reduce(
    (summary, row) => ({
      totalRuns: summary.totalRuns + (row.total_runs ?? 0),
      overdueRuns: summary.overdueRuns + (row.overdue_runs ?? 0),
      pendingReviews: summary.pendingReviews + (row.pending_review_runs ?? 0),
    }),
    { totalRuns: 0, overdueRuns: 0, pendingReviews: 0 },
  );
};
