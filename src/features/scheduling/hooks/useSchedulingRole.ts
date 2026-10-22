/**
 * Centralized role helpers for scheduling UI gating.
 */

import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useCan } from "@/hooks/useCan";
import { isManagerLikeRole, normaliseRole } from "@/utils/authRoles";
import { schedulePageVersion } from "@/features/roles/constants/pageVersion";

export interface SchedulingRole {
  isStaff: boolean;
  isManager: boolean;
  isOwner: boolean;
  canViewDrafts: boolean;
  canManageSchedule: boolean;
  canPublish: boolean;
  canApproveRequests: boolean;
  canManageAvailability: boolean;
  profileId: string | null;
  isLoading: boolean;
}

export function useSchedulingRole(): SchedulingRole {
  const { profile, loading: profileLoading } = useProfile();
  const { can, isLoading: permissionsLoading } = useCan();

  return useMemo(() => {
    const role = normaliseRole(profile?.role);
    const isManager = isManagerLikeRole(profile?.role);
    const isOwner = role === "owner";
    const isStaff = !isManager;
    const version = schedulePageVersion({
      viewTeamSchedules: can("viewTeamSchedules"),
      "schedule.view": can("schedule.view"),
      editSchedules: can("editSchedules"),
      "schedule.create": can("schedule.create"),
      "schedule.edit": can("schedule.edit"),
      "schedule.delete": can("schedule.delete"),
    });
    const canViewDrafts = version.draft || version.create || version.edit;
    const canManageSchedule =
      version.draft || version.create || version.edit || version.delete;
    const canPublish = version.edit;
    const canApproveRequests = isManager || can("approveTimeOff");
    const canManageAvailability = version.draft || version.edit;

    return {
      isStaff,
      isManager,
      isOwner,
      canViewDrafts,
      canManageSchedule,
      canPublish,
      canApproveRequests,
      canManageAvailability,
      profileId: profile?.id ?? null,
      isLoading: profileLoading || permissionsLoading,
    };
  }, [profile, profileLoading, permissionsLoading, can]);
}
