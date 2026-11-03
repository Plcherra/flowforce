import {
  serverResolvePermission,
  type PermissionContext,
} from "@/lib/permissions/resolver";
import type { PermissionValue } from "@/lib/permissions/registry";

export const AUTOMATION_RUN_PERMISSION = "ai.actions.automate" as const;

export type AutomationOverride = {
  permission_key: string | null;
  permission_value: string | null;
};

function booleanMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const map: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === true || entry === "allow") map[key] = true;
    if (entry === false || entry === "deny") map[key] = false;
  }
  return map;
}

function overridesForRun(
  overrides: readonly AutomationOverride[],
): PermissionContext["userOverrides"] {
  return overrides.flatMap((row) => {
    if (row.permission_key !== AUTOMATION_RUN_PERMISSION) return [];
    if (
      row.permission_value !== "allow" &&
      row.permission_value !== "deny" &&
      row.permission_value !== "inherit"
    ) {
      return [];
    }
    return [
      {
        permission_key: AUTOMATION_RUN_PERMISSION,
        permission_value: row.permission_value as PermissionValue,
      },
    ];
  });
}

export function actorCanRunAutomation(input: {
  productLevel: string | null;
  permissions: unknown;
  overrides: readonly AutomationOverride[];
}): boolean {
  const stored = booleanMap(input.permissions);
  const rolePermissions =
    input.productLevel === "owner"
      ? { [AUTOMATION_RUN_PERMISSION]: true, ...stored }
      : stored;
  return serverResolvePermission(
    {
      rolePermissions,
      userOverrides: overridesForRun(input.overrides),
    },
    AUTOMATION_RUN_PERMISSION,
  );
}
