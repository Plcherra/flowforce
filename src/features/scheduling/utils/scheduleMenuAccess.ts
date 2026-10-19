import type { SchedulingRole } from "../hooks/useSchedulingRole";

export interface ScheduleMenuAccess {
  /** Can decide other people's swaps and time off. */
  canReviewTeam: boolean;
  /** Can edit availability for people other than themselves. */
  canManageTeamAvailability: boolean;
  /** Can assign a reminder to themselves or another employee. */
  canAssignReminders: boolean;
}

/**
 * Schedule tools follow permissions, not only the job title.
 * A floor employee who is also allowed to edit the schedule gets the team tools.
 * Everyone else keeps only their own availability, requests, and reminders.
 */
export function scheduleMenuAccess(role: Pick<
  SchedulingRole,
  "canManageSchedule" | "canApproveRequests" | "canManageAvailability"
>): ScheduleMenuAccess {
  return {
    canReviewTeam: role.canApproveRequests || role.canManageSchedule,
    canManageTeamAvailability: role.canManageAvailability,
    canAssignReminders: role.canManageSchedule,
  };
}
