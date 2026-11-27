import type { TaskStatus } from "@/hooks/useTasks";
import { normalizeTaskStatus } from "@/hooks/useTasks";
import type { KnownTaskStatus } from "../types/filters";

/** Stored statuses that count and behave as open (no separate Start step). */
export const OPEN_TASK_STATUSES: readonly TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "blocked",
];

export function isOpenTaskStatus(status: string | null | undefined): boolean {
  const normalized = normalizeTaskStatus(status);
  return Boolean(normalized && OPEN_TASK_STATUSES.includes(normalized));
}

export function statusBucketForTabs(
  status: string | null | undefined,
): KnownTaskStatus | "other" | "done" {
  const normalized = normalizeTaskStatus(status);
  if (!normalized) return "other";
  if (normalized === "completed" || normalized === "done") return "done";
  if (
    normalized === "in_progress" ||
    normalized === "review" ||
    normalized === "blocked"
  ) {
    return "todo";
  }
  if (
    normalized === "todo" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }
  return "other";
}

/** UI status label: legacy in_progress rows read as open / To Do. */
export function displayStatusKey(status: string | null | undefined): string {
  if (status === "all" || status === "other") return status;
  if (isOpenTaskStatus(status) && normalizeTaskStatus(status) !== "todo") {
    return "todo";
  }
  const normalized = normalizeTaskStatus(status);
  if (normalized === "done" || normalized === "completed") return "completed";
  return normalized ?? "other";
}

export function matchesStatusTabFilter(
  taskStatus: string | null | undefined,
  tab: string,
): boolean {
  const bucket = statusBucketForTabs(taskStatus);
  if (tab === "all") return true;
  if (tab === "other") return bucket === "other";
  if (tab === "done" || tab === "completed") {
    return bucket === "done";
  }
  if (tab === "todo") {
    return bucket === "todo";
  }
  return normalizeTaskStatus(taskStatus) === tab;
}