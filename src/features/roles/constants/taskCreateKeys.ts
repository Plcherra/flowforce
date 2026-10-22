import type { PermissionKey } from "@/lib/permissions/registry";

export const TASK_CREATE_KINDS = ["shift", "checklist", "custom"] as const;

export type TaskCreateKind = (typeof TASK_CREATE_KINDS)[number];

export const TASK_CREATE_KEYS: Record<
  TaskCreateKind,
  { self: PermissionKey; others: PermissionKey }
> = {
  shift: {
    self: "tasks.shift.create_self",
    others: "tasks.shift.create_others",
  },
  checklist: {
    self: "tasks.checklist.create_self",
    others: "tasks.checklist.create_others",
  },
  custom: {
    self: "tasks.custom.create_self",
    others: "tasks.custom.create_others",
  },
};

const TASK_CREATE_PERMISSION_KEYS = new Set<string>(
  TASK_CREATE_KINDS.flatMap((kind) => [
    TASK_CREATE_KEYS[kind].self,
    TASK_CREATE_KEYS[kind].others,
  ]),
);

export function isTaskCreatePermissionKey(key: string): boolean {
  return TASK_CREATE_PERMISSION_KEYS.has(key);
}
