import { resolveProductLevel } from "./productLevels";

type ShiftDeleteRole = {
  product_level?: string | null;
  name?: string | null;
  hierarchy_level?: number | null;
  is_active?: boolean | null;
  permissions?: Record<string, boolean> | null;
};

export function managersCanDeleteShifts(roles: ShiftDeleteRole[]): boolean {
  const managers = roles.filter(
    (role) => role.is_active !== false && resolveProductLevel(role) === "manager",
  );
  return managers.every((role) => role.permissions?.["schedule.delete"] !== false);
}
