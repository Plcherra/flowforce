import type { PermissionKey } from "@/lib/permissions/registry";

export const LIST_ISSUE_READ_KEY = "tasks.list_issues.read" as const;
export const LIST_ISSUE_ACT_KEY = "tasks.list_issues.act" as const;

const LIST_ISSUE_PERMISSION_KEYS = new Set<string>([
  LIST_ISSUE_READ_KEY,
  LIST_ISSUE_ACT_KEY,
]);

export function isListIssuePermissionKey(key: string): key is PermissionKey {
  return LIST_ISSUE_PERMISSION_KEYS.has(key);
}
