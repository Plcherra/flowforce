import {
  OPERATOR_VERBS,
  applyOperatorVerbsToPermissions,
  getVisibleOperatorAreas,
  grantableVerbKeys,
  isVerbAvailable,
  isVerbEnabled,
  isVerbLockedOn,
  permissionsToOperatorVerbs,
  verbSelectionKey,
  type OperatorVerbSelection,
} from "./operatorBoxes";
import {
  permissionAllowedAtLevel,
  type ProductLevel,
} from "./productLevels";
import type { PermissionValue } from "@/lib/permissions/registry";

export type PermissionOverrideValue = Extract<PermissionValue, "allow" | "deny">;
export type PermissionDiffMap = Record<string, PermissionOverrideValue>;

export function isPermissionOverrideValue(
  value: unknown,
): value is PermissionOverrideValue {
  return value === "allow" || value === "deny";
}

export function sanitizePermissionDiffs(
  level: ProductLevel,
  diffs?: Record<string, unknown> | null,
): PermissionDiffMap {
  const next: PermissionDiffMap = {};
  if (!diffs || typeof diffs !== "object") return next;

  for (const [key, value] of Object.entries(diffs)) {
    if (!isPermissionOverrideValue(value)) continue;
    if (!permissionAllowedAtLevel(level, key)) continue;
    next[key] = value;
  }

  return next;
}

export function operatorVerbsToPermissionDiffs(
  level: ProductLevel,
  classPermissions: Record<string, boolean> | null | undefined,
  selectedVerbs: Iterable<string>,
): PermissionDiffMap {
  const selected = new Set(selectedVerbs);
  const diffs: PermissionDiffMap = {};

  for (const area of getVisibleOperatorAreas(level)) {
    for (const verb of OPERATOR_VERBS) {
      if (
        !isVerbAvailable(area, verb, level) ||
        isVerbLockedOn(area, verb, level)
      ) {
        continue;
      }

      const classOn = isVerbEnabled(area, verb, level, classPermissions);
      const personOn = selected.has(verbSelectionKey(area.key, verb));
      if (personOn === classOn) continue;

      for (const key of grantableVerbKeys(area, verb, level)) {
        diffs[key] = personOn ? "allow" : "deny";
      }
    }
  }

  return diffs;
}

export function applyPermissionDiffsToClassPermissions(
  level: ProductLevel,
  classPermissions: Record<string, boolean> | null | undefined,
  diffs?: PermissionDiffMap | null,
): Record<string, boolean> {
  const next: Record<string, boolean> = { ...(classPermissions ?? {}) };
  const sanitized = sanitizePermissionDiffs(level, diffs);

  for (const [key, value] of Object.entries(sanitized)) {
    next[key] = value === "allow";
  }

  return applyOperatorVerbsToPermissions(
    level,
    permissionsToOperatorVerbs(level, next),
    next,
  );
}

export function permissionDiffsToOperatorVerbs(
  level: ProductLevel,
  classPermissions: Record<string, boolean> | null | undefined,
  diffs?: PermissionDiffMap | null,
): OperatorVerbSelection[] {
  return permissionsToOperatorVerbs(
    level,
    applyPermissionDiffsToClassPermissions(level, classPermissions, diffs),
  );
}

export function retainAllowedDiffs(
  nextLevel: ProductLevel,
  nextClassPermissions: Record<string, boolean> | null | undefined,
  diffs?: PermissionDiffMap | null,
): PermissionDiffMap {
  const next: PermissionDiffMap = {};
  const sanitized = sanitizePermissionDiffs(nextLevel, diffs);

  for (const [key, value] of Object.entries(sanitized)) {
    const classOn = Boolean(nextClassPermissions?.[key]);
    const overrideOn = value === "allow";
    if (classOn === overrideOn) continue;
    next[key] = value;
  }

  return next;
}

export function permissionDiffsFromRows(
  rows?: Array<{
    permission_key?: string | null;
    permission_value?: string | null;
  }> | null,
): PermissionDiffMap {
  const next: PermissionDiffMap = {};
  for (const row of rows ?? []) {
    if (!row.permission_key || !isPermissionOverrideValue(row.permission_value)) {
      continue;
    }
    next[row.permission_key] = row.permission_value;
  }
  return next;
}

export function permissionDiffsToOverrideRecord(
  diffs?: PermissionDiffMap | null,
): Record<string, PermissionValue> {
  const next: Record<string, PermissionValue> = {};
  for (const [key, value] of Object.entries(diffs ?? {})) {
    next[key] = value;
  }
  return next;
}

export function allowKeysToClearOnClassSave(
  previous: Record<string, boolean> | null | undefined,
  next: Record<string, boolean> | null | undefined,
): string[] {
  const keys = new Set<string>([
    ...Object.keys(previous ?? {}),
    ...Object.keys(next ?? {}),
  ]);
  const clear: string[] = [];
  for (const key of keys) {
    const wasOn = Boolean(previous?.[key]);
    const isOn = Boolean(next?.[key]);
    if ((wasOn && !isOn) || isOn) {
      clear.push(key);
    }
  }
  return clear;
}
