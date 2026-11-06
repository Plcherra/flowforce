import {
  formIsOpenForFill,
  readFormDistribution,
} from "@/features/forms/utils/formDistribution";

export type CompanyRoleRef = {
  id: string;
  name: string | null;
};

export type RoleAttachedForm = {
  id: string;
  title?: string | null;
  settings?: unknown;
  status?: string | null;
};

export function scheduledRoleMatches(
  scheduledRole: string | null | undefined,
  roleIds: readonly string[],
  roles: readonly CompanyRoleRef[],
): boolean {
  const raw = scheduledRole?.trim() ?? "";
  if (!raw || roleIds.length === 0) return false;
  if (roleIds.includes(raw)) return true;
  const lower = raw.toLowerCase();
  return roleIds.some((roleId) => {
    const name = roles.find((role) => role.id === roleId)?.name?.trim().toLowerCase() ?? "";
    return name.length > 0 && name === lower;
  });
}

/** Published forms and lists attached to the shift role and open at `now`. */
export function formsForScheduledRole<T extends RoleAttachedForm>(input: {
  forms: readonly T[];
  scheduledRole: string | null | undefined;
  roles: readonly CompanyRoleRef[];
  now: Date;
}): T[] {
  return input.forms
    .filter((form) => {
      if (form.status !== "published") return false;
      const distribution = readFormDistribution(form.settings);
      if (
        !scheduledRoleMatches(
          input.scheduledRole,
          distribution.roleIds,
          input.roles,
        )
      ) {
        return false;
      }
      return formIsOpenForFill(distribution, input.now);
    })
    .sort((left, right) => {
      const leftDue = readFormDistribution(left.settings).dueAt ?? "";
      const rightDue = readFormDistribution(right.settings).dueAt ?? "";
      if (leftDue !== rightDue) return leftDue.localeCompare(rightDue);
      return `${left.title ?? ""}`.localeCompare(`${right.title ?? ""}`);
    });
}
