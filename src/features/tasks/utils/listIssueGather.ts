import type { PermissionDiffMap } from "@/features/roles/constants/personAccessDiffs";
import {
  LIST_ISSUE_ACT_KEY,
  LIST_ISSUE_READ_KEY,
  isListIssuePermissionKey,
} from "@/features/roles/constants/listIssueKeys";

export type ListIssueGrant = "none" | "read" | "act";

export function listIssueGrant(input: {
  isOwner: boolean;
  read: boolean;
  act: boolean;
}): ListIssueGrant {
  if (input.isOwner || input.act) return "act";
  if (input.read) return "read";
  return "none";
}

export function canSeeListIssueGather(grant: ListIssueGrant): boolean {
  return grant !== "none";
}

export function canActOnListIssue(grant: ListIssueGrant): boolean {
  return grant === "act";
}

export function listIssueMarkDoneAllowed(
  status: string | null | undefined,
): boolean {
  return status !== "done" && status !== "completed" && status !== "cancelled";
}

export function gatheredListIssues<T extends { links?: unknown; source?: string | null }>(
  tasks: T[],
): T[] {
  return tasks.filter((task) => {
    if (task.source != null && task.source !== "form") return false;
    if (!task.links || typeof task.links !== "object") return false;
    const kind = (task.links as { list_issue_kind?: unknown }).list_issue_kind;
    return kind === "missed_form" || kind === "missing_required" || kind === "flagged_item";
  });
}

export function listIssueGrantFromDiffs(
  classPermissions: Record<string, boolean> | null | undefined,
  diffs: PermissionDiffMap | null | undefined,
): ListIssueGrant {
  const enabled = (key: string) => {
    const diff = diffs?.[key];
    if (diff === "allow") return true;
    if (diff === "deny") return false;
    return Boolean(classPermissions?.[key]);
  };
  return listIssueGrant({
    isOwner: false,
    read: enabled(LIST_ISSUE_READ_KEY),
    act: enabled(LIST_ISSUE_ACT_KEY),
  });
}

export function diffsForListIssueGrant(
  classPermissions: Record<string, boolean> | null | undefined,
  diffs: PermissionDiffMap,
  grant: ListIssueGrant,
): PermissionDiffMap {
  const desired: Record<string, boolean> = {
    [LIST_ISSUE_READ_KEY]: grant === "read" || grant === "act",
    [LIST_ISSUE_ACT_KEY]: grant === "act",
  };
  const next: PermissionDiffMap = { ...diffs };
  for (const key of [LIST_ISSUE_READ_KEY, LIST_ISSUE_ACT_KEY]) {
    const classOn = Boolean(classPermissions?.[key]);
    if (desired[key] === classOn) delete next[key];
    else next[key] = desired[key] ? "allow" : "deny";
  }
  return next;
}

export function retainListIssueDiffs(diffs: PermissionDiffMap): PermissionDiffMap {
  const next: PermissionDiffMap = {};
  for (const [key, value] of Object.entries(diffs)) {
    if (isListIssuePermissionKey(key)) next[key] = value;
  }
  return next;
}
