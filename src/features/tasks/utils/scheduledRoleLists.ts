import {
  formIsOpenForFill,
  readFormDistribution,
} from "@/features/forms/utils/formDistribution";
import { readShiftAssignment } from "@/features/scheduling/utils/shiftRoleDepartment";

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
  roleId?: string | null;
  positionId?: string | null;
  roles: readonly ScheduledRole[];
  positions: readonly ScheduledPosition[];
}): string[] {
  const names = new Set<string>();
  const roleText = normalized(input.role);
  if (roleText) names.add(roleText);
  const ids = new Set<string>();
  if (input.roleId) ids.add(input.roleId);
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

export function roleIdsScheduledOnDay(input: {
  schedules: readonly {
    role: string | null;
    positionId?: string | null;
    position_id?: string | null;
    requirements?: unknown;
    start_time: string | null;
    end_time: string | null;
    user_id: string | null;
    is_published?: boolean | null;
    is_template?: boolean | null;
  }[];
  viewerId: string;
  now: Date;
  roles: readonly ScheduledRole[];
  positions: readonly ScheduledPosition[];
}): string[] {
  const dayStart = new Date(input.now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const ids = new Set<string>();
  for (const row of input.schedules) {
    if (row.user_id !== input.viewerId) continue;
    if (row.is_template === true || row.is_published === false) continue;
    if (!row.start_time) continue;
    const startMs = new Date(row.start_time).getTime();
    if (Number.isNaN(startMs)) continue;
    const endMs = row.end_time ? new Date(row.end_time).getTime() : startMs + 60 * 60 * 1000;
    if (!(startMs < dayEnd.getTime() && endMs > dayStart.getTime())) continue;
    for (const id of scheduledRoleIds({
      role: row.role,
      roleId: readShiftAssignment(row.requirements).roleId,
      positionId: row.positionId ?? row.position_id ?? null,
      roles: input.roles,
      positions: input.positions,
    })) {
      ids.add(id);
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
