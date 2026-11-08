const PRODUCT_NAMES = new Set([
  "owner",
  "admin",
  "administrator",
  "manager",
  "staff",
  "employee",
]);

export type InviteRoleRecord = {
  id: string;
  name: string;
  department_id?: string | null;
  is_system_role?: boolean | null;
};

export function isShopRole(role: InviteRoleRecord) {
  if (role.department_id) return true;
  if (role.is_system_role) return false;
  return !PRODUCT_NAMES.has(role.name.trim().toLowerCase());
}

export function rolesForInvite<T extends InviteRoleRecord>(roles: readonly T[]): T[] {
  const shop = roles.filter(isShopRole);
  if (shop.length > 0) return shop;
  const custom = roles.filter((role) => !PRODUCT_NAMES.has(role.name.trim().toLowerCase()));
  return custom.length > 0 ? custom : [...roles];
}

export function rolesInDepartment<T extends InviteRoleRecord>(
  roles: readonly T[],
  departmentId: string,
): T[] {
  const listed = rolesForInvite(roles);
  if (!departmentId) return listed;
  const matched = listed.filter((role) => role.department_id === departmentId);
  return matched.length > 0 ? matched : listed.filter((role) => !role.department_id);
}
