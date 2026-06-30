import { differenceInCalendarDays, isPast, isToday } from "date-fns";
import type { TaskWithRelations } from "@/hooks/useTasks";
import type { ReminderRecord } from "@/features/tasks/repositories/remindersRepository";

type TaskStatusBucket =
  | "todo"
  | "in_progress"
  | "review"
  | "blocked"
  | "completed"
  | "cancelled"
  | "other";

export interface TaskExecutionIssue {
  id: string;
  label: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  taskId?: string;
}

export interface TaskExecutionSummary {
  totalTasks: number;
  activeTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  dueThisWeekTasks: number;
  blockedTasks: number;
  reviewTasks: number;
  unassignedTasks: number;
  unlinkedTasks: number;
  connectedTasks: number;
  recurringReminders: number;
  taskReminders: number;
  completionRate: number;
  issues: TaskExecutionIssue[];
}

const activeStatuses = new Set<TaskStatusBucket>([
  "todo",
  "in_progress",
  "review",
  "blocked",
  "other",
]);

function normalizeStatus(status?: string | null): TaskStatusBucket {
  const value = (status ?? "").toLowerCase();
  if (value === "done") return "completed";
  if (
    value === "todo" ||
    value === "in_progress" ||
    value === "review" ||
    value === "blocked" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "other";
}

function isActiveTask(task: TaskWithRelations) {
  return activeStatuses.has(normalizeStatus(task.status));
}

function hasConnection(task: TaskWithRelations) {
  return Boolean(
    task.goal_id ||
      task.workflowid ||
      task.origin_documentid ||
      task.origin_event_id ||
      task.parent_task_id ||
      task.source,
  );
}

function taskTitle(task: TaskWithRelations) {
  return task.title?.trim() || "Untitled task";
}

export function buildTaskExecutionSummary({
  tasks,
  reminders,
  now = new Date(),
}: {
  tasks: TaskWithRelations[];
  reminders: ReminderRecord[];
  now?: Date;
}): TaskExecutionSummary {
  const activeTasks = tasks.filter(isActiveTask);
  const completedCount = tasks.filter(
    (task) => normalizeStatus(task.status) === "completed",
  ).length;
  const taskReminderIds = new Set(
    reminders
      .filter((reminder) => reminder.task_id && !reminder.completed)
      .map((reminder) => reminder.task_id),
  );

  const overdueTasks = activeTasks.filter(
    (task) => task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)),
  );
  const dueTodayTasks = activeTasks.filter(
    (task) => task.due_date && isToday(new Date(task.due_date)),
  );
  const dueThisWeekTasks = activeTasks.filter((task) => {
    if (!task.due_date) return false;
    const days = differenceInCalendarDays(new Date(task.due_date), now);
    return days >= 0 && days <= 7;
  });
  const blockedTasks = activeTasks.filter(
    (task) => normalizeStatus(task.status) === "blocked",
  );
  const reviewTasks = activeTasks.filter(
    (task) => normalizeStatus(task.status) === "review",
  );
  const unassignedTasks = activeTasks.filter((task) => !task.assigned_to);
  const unlinkedTasks = activeTasks.filter((task) => !hasConnection(task));
  const connectedTasks = tasks.filter(hasConnection);
  const recurringReminders = reminders.filter(
    (reminder) => reminder.repeat_enabled && !reminder.completed,
  ).length;

  const issues: TaskExecutionIssue[] = [
    ...overdueTasks.slice(0, 4).map((task) => ({
      id: `overdue-${task.id}`,
      label: "Overdue task",
      detail: taskTitle(task),
      severity: "critical" as const,
      taskId: task.id,
    })),
    ...blockedTasks.slice(0, 3).map((task) => ({
      id: `blocked-${task.id}`,
      label: "Blocked task",
      detail: taskTitle(task),
      severity: "warning" as const,
      taskId: task.id,
    })),
    ...unassignedTasks.slice(0, 3).map((task) => ({
      id: `unassigned-${task.id}`,
      label: "Unassigned task",
      detail: taskTitle(task),
      severity: "warning" as const,
      taskId: task.id,
    })),
    ...activeTasks
      .filter((task) => task.due_date && !taskReminderIds.has(task.id))
      .slice(0, 3)
      .map((task) => ({
        id: `reminder-${task.id}`,
        label: "Due task without reminder",
        detail: taskTitle(task),
        severity: "info" as const,
        taskId: task.id,
      })),
  ];

  return {
    totalTasks: tasks.length,
    activeTasks: activeTasks.length,
    overdueTasks: overdueTasks.length,
    dueTodayTasks: dueTodayTasks.length,
    dueThisWeekTasks: dueThisWeekTasks.length,
    blockedTasks: blockedTasks.length,
    reviewTasks: reviewTasks.length,
    unassignedTasks: unassignedTasks.length,
    unlinkedTasks: unlinkedTasks.length,
    connectedTasks: connectedTasks.length,
    recurringReminders,
    taskReminders: taskReminderIds.size,
    completionRate:
      tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
    issues,
  };
}
