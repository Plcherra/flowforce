import productRoleContract from "./productRoleContract.json";
import {
  clampPermissionsToProductLevel,
  permissionAllowedAtLevel,
  type ProductLevel,
} from "./productLevels";
import { getProductRolePermissions } from "./productRoles";
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissions/registry";
import { isTaskCreatePermissionKey } from "./taskCreateKeys";
import { isListIssuePermissionKey } from "./listIssueKeys";

export const OPERATOR_VERBS = ["see", "edit", "create_delete"] as const;

export type OperatorVerb = (typeof OPERATOR_VERBS)[number];

export const OPERATOR_VERB_LABELS: Record<OperatorVerb, string> = {
  see: "See",
  edit: "Edit",
  create_delete: "Create / delete",
};

export type OperatorAreaKey =
  | "profile"
  | "my_schedule"
  | "team_schedule"
  | "my_tasks"
  | "run_lists"
  | "expenses"
  | "time_off"
  | "inventory"
  | "reports"
  | "ai"
  | "team"
  | "settings";

export type OperatorAreaDefinition = {
  key: OperatorAreaKey;
  label: string;
  description: string;
  min_product_level: ProductLevel;
  owner_locked_verbs: OperatorVerb[];
  verbs: Record<OperatorVerb, PermissionKey[]>;
};

export type OperatorVerbSelection = `${OperatorAreaKey}:${OperatorVerb}`;

type RawOperatorArea = {
  key: string;
  label: string;
  description: string;
  min_product_level: string;
  owner_locked_verbs?: string[];
  verbs: Partial<Record<OperatorVerb, string[]>>;
};

const rawAreas = (productRoleContract.operatorAreas ?? []) as RawOperatorArea[];

export const OPERATOR_AREAS: OperatorAreaDefinition[] = rawAreas.map((area) => ({
  key: area.key as OperatorAreaKey,
  label: area.label,
  description: area.description,
  min_product_level: area.min_product_level as ProductLevel,
  owner_locked_verbs: (area.owner_locked_verbs ?? []).filter((verb) =>
    OPERATOR_VERBS.includes(verb as OperatorVerb),
  ) as OperatorVerb[],
  verbs: {
    see: (area.verbs.see ?? []) as PermissionKey[],
    edit: (area.verbs.edit ?? []) as PermissionKey[],
    create_delete: (area.verbs.create_delete ?? []) as PermissionKey[],
  },
}));

export function verbSelectionKey(
  area: string,
  verb: OperatorVerb,
): OperatorVerbSelection {
  return `${area}:${verb}` as OperatorVerbSelection;
}

export function parseVerbSelection(
  value: string,
): { area: OperatorAreaKey; verb: OperatorVerb } | undefined {
  const [area, verb] = value.split(":");
  if (!OPERATOR_VERBS.includes(verb as OperatorVerb)) return undefined;
  const definition = getOperatorAreaDefinition(area);
  if (!definition) return undefined;
  return { area: definition.key, verb: verb as OperatorVerb };
}

export function getOperatorAreaDefinition(
  key: string,
): OperatorAreaDefinition | undefined {
  return OPERATOR_AREAS.find((area) => area.key === key);
}

export function grantableVerbKeys(
  area: OperatorAreaDefinition,
  verb: OperatorVerb,
  level: ProductLevel,
): PermissionKey[] {
  return area.verbs[verb].filter(
    (key) =>
      !isTaskCreatePermissionKey(key) &&
      !isListIssuePermissionKey(key) &&
      permissionAllowedAtLevel(level, key),
  );
}

export function isVerbAvailable(
  area: OperatorAreaDefinition,
  verb: OperatorVerb,
  level: ProductLevel,
): boolean {
  return grantableVerbKeys(area, verb, level).length > 0;
}

export function isOperatorAreaVisibleAtLevel(
  _area: OperatorAreaDefinition,
  _level: ProductLevel,
): boolean {
  return true;
}

export function getVisibleOperatorAreas(
  _level: ProductLevel,
): OperatorAreaDefinition[] {
  return OPERATOR_AREAS;
}

export function isVerbLockedOn(
  area: OperatorAreaDefinition,
  verb: OperatorVerb,
  level: ProductLevel,
): boolean {
  return level === "owner" && area.owner_locked_verbs.includes(verb);
}

export function isVerbEnabled(
  area: OperatorAreaDefinition,
  verb: OperatorVerb,
  level: ProductLevel,
  permissions?: Record<string, boolean> | null,
): boolean {
  if (isVerbLockedOn(area, verb, level)) return true;
  const grantable = grantableVerbKeys(area, verb, level);
  if (grantable.length === 0) return false;
  return grantable.every((key) => Boolean(permissions?.[key]));
}

export function enabledVerbsForArea(
  area: OperatorAreaDefinition,
  level: ProductLevel,
  permissions?: Record<string, boolean> | null,
): OperatorVerb[] {
  return OPERATOR_VERBS.filter((verb) =>
    isVerbEnabled(area, verb, level, permissions),
  );
}

export function permissionsToOperatorVerbs(
  level: ProductLevel,
  permissions?: Record<string, boolean> | null,
): OperatorVerbSelection[] {
  const selected: OperatorVerbSelection[] = [];
  for (const area of getVisibleOperatorAreas(level)) {
    for (const verb of OPERATOR_VERBS) {
      if (isVerbEnabled(area, verb, level, permissions)) {
        selected.push(verbSelectionKey(area.key, verb));
      }
    }
  }
  return selected;
}

export function applyOperatorVerbsToPermissions(
  level: ProductLevel,
  enabledVerbs: Iterable<string>,
  previousPermissions?: Record<string, boolean> | null,
): Record<string, boolean> {
  const enabled = new Set(enabledVerbs);
  const next: Record<string, boolean> = { ...(previousPermissions ?? {}) };

  for (const area of OPERATOR_AREAS) {
    for (const verb of OPERATOR_VERBS) {
      if (!isVerbAvailable(area, verb, level) && !isVerbLockedOn(area, verb, level)) {
        continue;
      }
      const on =
        isVerbLockedOn(area, verb, level) ||
        enabled.has(verbSelectionKey(area.key, verb));
      for (const key of grantableVerbKeys(area, verb, level)) {
        next[key] = on;
      }
    }
  }

  return clampPermissionsToProductLevel(level, next);
}

export function defaultOperatorVerbSelection(
  level: ProductLevel,
): OperatorVerbSelection[] {
  return permissionsToOperatorVerbs(level, getProductRolePermissions(level));
}

export function classifiedOperatorBoxKeys(): Set<string> {
  const keys = new Set<string>();
  for (const area of OPERATOR_AREAS) {
    for (const verb of OPERATOR_VERBS) {
      for (const key of area.verbs[verb]) {
        keys.add(key);
      }
    }
  }
  return keys;
}

export function unclassifiedPermissionKeys(): PermissionKey[] {
  const classified = classifiedOperatorBoxKeys();
  return PERMISSION_KEYS.filter((key) => !classified.has(key));
}
