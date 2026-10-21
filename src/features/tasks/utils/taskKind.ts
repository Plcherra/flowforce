export type TaskKind = "shift" | "checklist" | "custom";
export type TaskKindFilter = TaskKind | "all";

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  shift: "Shift",
  checklist: "Checklist",
  custom: "Custom",
};

export function readTaskKind(task: { source?: string | null }): TaskKind {
  if (task.source === "schedule") return "shift";
  if (task.source === "form") return "checklist";
  return "custom";
}
