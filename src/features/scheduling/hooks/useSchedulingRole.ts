/**
 * Centralized role helpers for scheduling UI gating.
 */

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCan } from "@/hooks/useCan";
import {
  canViewScheduleDrafts,
  isManagerLikeRole,
  normaliseRole,
} from "@/utils/authRoles";
import { isLeadershipLevel } from "@/features/scheduling/utils/leadershipLevel";

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
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { can, isLoading: permissionsLoading } = useCan();

  return useMemo(() => {
    const role = normaliseRole(profile?.role);
    const isManager = isManagerLikeRole(profile?.role);
    const isOwner = role === "owner";
    const isStaff = !isManager;
    const canViewDrafts = canViewScheduleDrafts(user, profile?.role);
    const leadership = isLeadershipLevel({ name: profile?.role });
    const canManageSchedule = leadership && (isManager || can("editSchedules"));
    const canPublish = leadership && (isManager || can("editSchedules"));
    const canApproveRequests = isManager || can("approveTimeOff");
    const canManageAvailability = leadership && (isManager || can("editSchedules"));

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
  }, [user, profile, profileLoading, permissionsLoading, can]);
}
