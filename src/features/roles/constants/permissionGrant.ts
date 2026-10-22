import { createPermissionResolver } from "@/lib/permissions/resolver";
import type { PermissionValue } from "@/lib/permissions/registry";
import type { ProductLevel } from "./productLevels";
import { getProductRolePermissions } from "./productRoles";

export const DIRECTORY_VIEW_KEY = "directory.view" as const;
export const DIRECTORY_GRANT_RIGHT = "directory.view.grant";

export type PermissionOverride = {
  permission_key: string;
  permission_value: Extract<PermissionValue, "allow" | "deny">;
};

export function seesEmployeeDirectory(input: {
  level: ProductLevel;
  hierarchyLevel?: number | null;
  overrides?: PermissionOverride[];
}): boolean {
  void input.hierarchyLevel;
  const resolver = createPermissionResolver({
    rolePermissions: getProductRolePermissions(input.level),
    userOverrides: (input.overrides ?? [])
      .filter((row) => row.permission_key === DIRECTORY_VIEW_KEY)
      .map((row) => ({
        permission_key: DIRECTORY_VIEW_KEY,
        permission_value: row.permission_value,
      })),
  });
  return resolver.resolve(DIRECTORY_VIEW_KEY);
}

export function holdsDirectoryGrantRight(
  overrides?: PermissionOverride[] | null,
): boolean {
  return (overrides ?? []).some(
    (row) =>
      row.permission_key === DIRECTORY_GRANT_RIGHT &&
      row.permission_value === "allow",
  );
}

export function canGrantDirectoryView(input: {
  level: ProductLevel;
  hierarchyLevel?: number | null;
  overrides?: PermissionOverride[];
}): boolean {
  void input.hierarchyLevel;
  if (input.level === "owner") return true;
  return holdsDirectoryGrantRight(input.overrides);
}

export function directoryGrantChange(input: {
  actorLevel: ProductLevel;
  actorOverrides?: PermissionOverride[];
  allowDirectory: boolean;
  grantTheRight: boolean;
}): PermissionOverride[] | null {
  if (
    !canGrantDirectoryView({
      level: input.actorLevel,
      overrides: input.actorOverrides,
    })
  ) {
    return null;
  }

  const rows: PermissionOverride[] = [
    {
      permission_key: DIRECTORY_VIEW_KEY,
      permission_value: input.allowDirectory ? "allow" : "deny",
    },
  ];
  if (input.grantTheRight) {
    rows.push({
      permission_key: DIRECTORY_GRANT_RIGHT,
      permission_value: "allow",
    });
  }
  return rows;
}
