import type { PermissionKey } from "@/lib/permissions/registry";
import type { PermissionDiffMap } from "@/features/roles/constants/personAccessDiffs";
import {
  isTaskCreatePermissionKey,
  TASK_CREATE_KEYS,
  type TaskCreateKind,
} from "@/features/roles/constants/taskCreateKeys";
import { taskCreateLevel, type TaskCreateLevel } from "./taskCreateLevel";
import type { TaskCreateScope } from "@/features/roles/constants/taskCreateScope";

export function taskCreateLevelFromDiffs(
  classPermissions: Record<string, boolean> | null | undefined,
  diffs: PermissionDiffMap | null | undefined,
  kind: TaskCreateKind,
): TaskCreateLevel {
  const keys = TASK_CREATE_KEYS[kind];
  const enabled = (key: string) => {
    const diff = diffs?.[key];
    if (diff === "allow") return true;
    if (diff === "deny") return false;
    return Boolean(classPermissions?.[key]);
  };
  return taskCreateLevel({
    createOthers: enabled(keys.others),
    createSelf: enabled(keys.self),
  });
}

export function diffsForTaskCreateLevel(
  classPermissions: Record<string, boolean> | null | undefined,
  diffs: PermissionDiffMap,
  kind: TaskCreateKind,
  level: TaskCreateLevel,
): PermissionDiffMap {
  const keys = TASK_CREATE_KEYS[kind];
  const desired: Record<string, boolean> = {
    [keys.others]: level === "others",
    [keys.self]: level === "others" || level === "self",
  };
  const next: PermissionDiffMap = { ...diffs };
  for (const key of [keys.others, keys.self]) {
    const classOn = Boolean(classPermissions?.[key]);
    if (desired[key] === classOn) {
      delete next[key];
    } else {
      next[key] = desired[key] ? "allow" : "deny";
    }
  }
  return next;
}

export function retainTaskCreateDiffs(
  diffs: PermissionDiffMap,
): PermissionDiffMap {
  const next: PermissionDiffMap = {};
  for (const [key, value] of Object.entries(diffs)) {
    if (isTaskCreatePermissionKey(key)) next[key] = value;
  }
  return next;
}

export function taskCreateDialogProps(input: {
  permissionsLoading: boolean;
  level: TaskCreateLevel;
  scope: TaskCreateScope | null;
}): { createLevel: "self" | "others"; scope: TaskCreateScope | null } | null {
  if (input.permissionsLoading || input.level === "none") return null;
  return {
    createLevel: input.level === "self" ? "self" : "others",
    scope: input.scope,
  };
}

export function taskCreateKeysAreSet(
  kind: TaskCreateKind,
  getSource: (key: PermissionKey) => string,
): boolean {
  const keys = TASK_CREATE_KEYS[kind];
  return getSource(keys.self) !== "role" || getSource(keys.others) !== "role";
}
