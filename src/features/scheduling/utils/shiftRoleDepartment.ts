const ACCESS_LEVELS = new Set(["staff", "manager", "admin", "owner"]);

export type ShiftRoleChoice = { id: string; name: string };
export type ShiftDepartmentChoice = { id: string; name: string | null };

export type ShiftAssignmentMeta = {
  roleId: string | null;
  roleName: string | null;
  departmentId: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isAccessLevelLabel(value: string | null | undefined): boolean {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return ACCESS_LEVELS.has(trimmed);
}

export function readShiftAssignment(requirements: unknown): ShiftAssignmentMeta {
  const source = record(requirements);
  return {
    roleId: text(source?.role_id),
    roleName: text(source?.role_name),
    departmentId: text(source?.department_id),
  };
}

/** Keeps copilot and other object fields. An older array of requirements is kept under items. */
export function mergeShiftAssignment(
  requirements: unknown,
  meta: ShiftAssignmentMeta,
): Record<string, unknown> {
  const next = record(requirements) ? { ...record(requirements) } : {};
  if (Array.isArray(requirements)) next.items = requirements;
  next.role_id = meta.roleId;
  next.role_name = meta.roleName;
  next.department_id = meta.departmentId;
  return next;
}

export function displayShiftRole(input: {
  role: string | null | undefined;
  requirements: unknown;
  roles: readonly ShiftRoleChoice[];
}): string | null {
  const meta = readShiftAssignment(input.requirements);
  if (meta.roleId) {
    const match = input.roles.find((role) => role.id === meta.roleId);
    const name = match?.name.trim() || meta.roleName;
    return name || null;
  }
  const stored = input.role?.trim() ?? "";
  if (!stored || isAccessLevelLabel(stored)) return null;
  const byId = input.roles.find((role) => role.id === stored);
  if (byId?.name.trim()) return byId.name.trim();
  const byName = input.roles.find(
    (role) => role.name.trim().toLowerCase() === stored.toLowerCase(),
  );
  return byName?.name.trim() || stored;
}

export function displayShiftDepartment(input: {
  requirements: unknown;
  departments: readonly ShiftDepartmentChoice[];
}): string | null {
  const id = readShiftAssignment(input.requirements).departmentId;
  if (!id) return null;
  const name = input.departments.find((department) => department.id === id)?.name?.trim();
  return name || null;
}

export function departmentNameProblem(
  name: string,
  existing: readonly { id: string; name: string | null }[],
  ignoreId?: string | null,
): "empty" | "duplicate" | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return "empty";
  const taken = existing.some(
    (department) =>
      department.id !== ignoreId &&
      (department.name?.trim().toLowerCase() ?? "") === trimmed,
  );
  return taken ? "duplicate" : null;
}
