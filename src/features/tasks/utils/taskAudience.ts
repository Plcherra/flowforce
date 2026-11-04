import { readAssigneeIds } from "./shiftTaskWrite";
import { isTaskListedForViewer } from "./taskSchedule";

type AudienceTask = {
  created_by?: string | null;
  assigned_to?: string | null;
  links?: unknown;
};

export function taskInvolvesViewer(
  task: AudienceTask,
  viewerId: string | null | undefined,
): boolean {
  if (!viewerId) return false;
  if (task.created_by === viewerId || task.assigned_to === viewerId) return true;
  return readAssigneeIds(task.links, null).includes(viewerId);
}

/**
 * Managers who can see the team list see every published task.
 * Staff see a task only when they created it or are one of its people.
 * Drafts and scheduled tasks still follow the publish window.
 */
export function canSeeTask(
  task: AudienceTask,
  viewerId: string | null | undefined,
  canSeeTeam: boolean,
  now: Date = new Date(),
): boolean {
  if (!isTaskListedForViewer(task, viewerId, now)) return false;
  if (canSeeTeam) return true;
  return taskInvolvesViewer(task, viewerId);
}
