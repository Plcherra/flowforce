import { dueDateFromWindowEnd, mergeTaskSchedule } from "@/features/tasks/utils/taskSchedule";

export type ShiftTaskPriority = "low" | "medium" | "high";

export type ShiftTaskDraft = {
  title: string;
  description: string;
  priority: ShiftTaskPriority;
  estimatedMinutes: number;
  formId: string | null;
  assigneeIds: string[];
  startsAt: string | null;
  endsAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function uniqueAssigneeIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

export function readFormId(links: unknown): string | null {
  if (!isRecord(links) || typeof links.form_id !== "string") return null;
  const trimmed = links.form_id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readAssigneeIds(
  links: unknown,
  assignedTo?: string | null,
): string[] {
  const fromLinks = isRecord(links) && Array.isArray(links.assignee_ids)
    ? uniqueAssigneeIds(links.assignee_ids.filter((id): id is string => typeof id === "string"))
    : [];
  if (fromLinks.length > 0) return fromLinks;
  const fallback = typeof assignedTo === "string" ? assignedTo.trim() : "";
  return fallback ? [fallback] : [];
}

export function shiftTaskRow(input: ShiftTaskDraft & {
  companyId: string;
  createdBy: string;
  scheduleId: string;
  shiftTitle: string;
  fallbackDue?: string | null;
}) {
  const assigneeIds = uniqueAssigneeIds(input.assigneeIds);
  const links = mergeTaskSchedule(
    {
      schedule_id: input.scheduleId,
      shift_title: input.shiftTitle,
      form_id: input.formId,
      assignee_ids: assigneeIds,
    },
    {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      publishState: "published",
    },
  );
  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
    priority: input.priority,
    estimated_hours: Math.max(0, input.estimatedMinutes) / 60,
    company_id: input.companyId,
    created_by: input.createdBy,
    assigned_to: assigneeIds[0] ?? null,
    due_date:
      dueDateFromWindowEnd(input.endsAt) ??
      dueDateFromWindowEnd(input.fallbackDue),
    status: "todo" as const,
    source: "schedule" as const,
    tags: ["schedule", input.scheduleId],
    links,
  };
}
