import {
  formIsOpenForFill,
  readFormDistribution,
} from "@/features/forms/utils/formDistribution";

export type ScheduledRole = { id: string; name: string };

export type ScheduledPosition = {
  id: string;
  name: string;
  roleId: string | null;
};

export type ScheduledRoleForm = {
  id: string;
  title?: string | null;
  settings?: unknown;
  status?: string | null;
};

function normalized(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function scheduledRoleIds(input: {
  role: string | null;
  positionId?: string | null;
  roles: readonly ScheduledRole[];
  positions: readonly ScheduledPosition[];
}): string[] {
  const names = new Set<string>();
  const roleText = normalized(input.role);
  if (roleText) names.add(roleText);
  const ids = new Set<string>();
  if (input.positionId) {
    const position = input.positions.find((item) => item.id === input.positionId);
    if (position?.roleId) ids.add(position.roleId);
    const positionName = normalized(position?.name);
    if (positionName) names.add(positionName);
  }
  for (const role of input.roles) {
    const name = normalized(role.name);
    if ((name && names.has(name)) || (roleText && role.id === input.role)) {
      ids.add(role.id);
    }
  }
  return [...ids];
}

export function roleListsForShift<T extends ScheduledRoleForm>(
  forms: readonly T[],
  roleIds: readonly string[],
  now: Date,
  alreadyShown: ReadonlySet<string> = new Set(),
): T[] {
  if (roleIds.length === 0) return [];
  return forms.filter((form) => {
    if (alreadyShown.has(form.id)) return false;
    if (form.status === "draft" || form.status === "archived") return false;
    const distribution = readFormDistribution(form.settings);
    if (!distribution.roleIds.some((id) => roleIds.includes(id))) return false;
    return formIsOpenForFill(distribution, now);
  });
}
