export const ACCESS_GROUPS = [
  {
    id: "profile",
    labelKey: "settings.accessGroupProfile",
    rowIds: ["own_profile", "team_profiles", "directory", "positions", "people"],
  },
  {
    id: "schedule",
    labelKey: "settings.accessGroupSchedule",
    rowIds: ["own_schedule", "team_schedule", "shifts", "schedule_grant", "reminders", "time_off"],
  },
  {
    id: "tasks",
    labelKey: "settings.accessGroupTasks",
    rowIds: [
      "own_tasks",
      "team_tasks",
      "task_record",
      "submitted_forms",
      "form_templates",
      "form_approval",
      "form_submit",
      "workflow_evidence",
      "workflow_review",
      "workflow_exceptions",
      "workflow_assign",
    ],
  },
  {
    id: "stock",
    labelKey: "settings.accessGroupStock",
    rowIds: [
      "inventory_items",
      "inventory_adjust",
      "inventory_import",
      "inventory_export",
      "purchasing",
      "counts",
      "count_approval",
      "waste",
      "prep",
    ],
  },
] as const;

export function accessGroupForRow(rowId: string): string {
  const match = ACCESS_GROUPS.find((group) =>
    (group.rowIds as readonly string[]).includes(rowId),
  );
  return match?.id ?? "settings";
}
