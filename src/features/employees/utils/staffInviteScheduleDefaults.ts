import { applyPermissionDiffsToClassPermissions } from "@/features/roles/constants/personAccessDiffs";
import type { PermissionDiffMap } from "@/features/roles/constants/personAccessDiffs";
import type { ProductLevel } from "@/features/roles/constants/productLevels";

export function staffInviteScheduleDefaultDiffs(): PermissionDiffMap {
  return {
    viewTeamSchedules: "allow",
    "schedule.view": "allow",
  };
}

export function effectiveInvitePermissions(
  level: ProductLevel,
  classPermissions: Record<string, boolean> | null | undefined,
  diffs?: PermissionDiffMap | null,
) {
  const defaults = level === "staff" ? staffInviteScheduleDefaultDiffs() : {};
  return applyPermissionDiffsToClassPermissions(level, classPermissions, {
    ...defaults,
    ...(diffs ?? {}),
  });
}
