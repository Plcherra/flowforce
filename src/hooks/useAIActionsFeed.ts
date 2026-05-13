import { useMemo, useCallback } from "react";
import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  formatDistanceToNowStrict,
  subDays,
} from "date-fns";
import { useTasks } from "./useTasks";
import { useGoals } from "./useGoals";
import { useReminders } from "./useReminders";
import { useTaskNotifications } from "@/features/tasks";
import { useProfile } from "./useProfile";
import { useSchedulingConsolidated } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import { useExpenses, type Expense } from "./useExpenses";

export type FeedSource =
  | "tasks"
  | "goals"
  | "reminders"
  | "notifications"
  | "scheduling"
  | "expenses";
export type FeedSeverity = "critical" | "high" | "medium" | "low";

type BaseFeedAction = {
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export type FeedAction =
  | (BaseFeedAction & {
      type: "create_task";
      payload: {
        title: string;
        description?: string;
        priority?: "low" | "medium" | "high" | "urgent";
        dueDateOffsetDays?: number;
      };
    })
  | (BaseFeedAction & {
      type: "open_route";
      payload: { path: string };
    })
  | (BaseFeedAction & {
      type: "complete_reminder";
      payload: { reminderId: string };
    })
  | (BaseFeedAction & {
      type: "snooze_reminder";
      payload: { reminderId: string; minutes: number };
    })
  | (BaseFeedAction & {
      type: "mark_notifications_read";
    })
  | (BaseFeedAction & {
      type: "refresh";
    });

export interface AIActionsFeedItem {
  id: string;
  title: string;
  description: string;
  severity: FeedSeverity;
  source: FeedSource;
  details?: string[];
  actions: FeedAction[];
  timestamp?: string;
  score?: number;
}

const severityRank: Record<FeedSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const formatRelative = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch {
    return null;
  }
};

const normalizeExpenseDate = (expense: Expense) => {
  if (expense.expense_date) return new Date(expense.expense_date);
  if (expense.created_at) return new Date(expense.created_at);
  return null;
};

export function useAIActionsFeed() {
  const { profile, loading: profileLoading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const hasCompanyContext = Boolean(companyId);

  const {
    tasks = [],
    loading: tasksLoading,
    createTask,
    refetchTasks,
  } = useTasks();
  const {
    goals = [],
    loading: goalsLoading,
    calculateGoalProgress,
    refetchGoals,
  } = useGoals();
  const {
    reminders = [],
    loading: remindersLoading,
    markAsCompleted: markReminderCompleted,
    snoozeReminder,
    refetchReminders,
  } = useReminders();
  const {
    notifications = [],
    unreadCount = 0,
    loading: notificationsLoading,
    markAllAsRead,
    refetchNotifications,
  } = useTaskNotifications();
  const expensesQuery = useExpenses();
  const refetchExpenses = expensesQuery.refetch;
  const expenses = useMemo<Expense[]>(
    () => (hasCompanyContext ? (expensesQuery.data ?? []) : []) as Expense[],
    [expensesQuery.data, hasCompanyContext],
  );

  const schedulingWindow = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 7);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const {
    shifts,
    loading: schedulingLoading,
    refetchAll: refetchScheduling,
    isUsingFallbackData,
  } = useSchedulingConsolidated({
    companyId,
    start: schedulingWindow.start,
    end: schedulingWindow.end,
    enabled: hasCompanyContext,
  });

  const items = useMemo<AIActionsFeedItem[]>(() => {
    if (!hasCompanyContext) {
      return [];
    }

    const now = new Date();
    const upcomingThreshold = addDays(now, 7);
    const itemsAccumulator: AIActionsFeedItem[] = [];

    const isTaskClosed = (status?: string | null) =>
      status === "completed" || status === "cancelled";

    const overdueTasks = tasks.filter(
      (task) =>
        task.due_date &&
        new Date(task.due_date) < now &&
        !isTaskClosed(task.status),
    );
    if (overdueTasks.length > 0) {
      const sorted = [...overdueTasks].sort(
        (a, b) =>
          new Date(a.due_date ?? "").getTime() -
          new Date(b.due_date ?? "").getTime(),
      );
      const oldest = sorted[0];
      const oldestRelative = formatRelative(oldest.due_date);
      itemsAccumulator.push({
        id: "tasks-overdue",
        title: `Resolve ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
        description:
          oldestRelative && oldest.title
            ? `Oldest overdue item "${oldest.title}" was due ${oldestRelative}.`
            : "Several tasks need immediate attention.",
        severity: overdueTasks.length >= 3 ? "critical" : "high",
        source: "tasks",
        details: sorted.slice(0, 3).map((task) => {
          const relative = formatRelative(task.due_date);
          return `${task.title ?? "Untitled task"}${relative ? ` • due ${relative}` : ""}`;
        }),
        actions: [
          {
            type: "create_task",
            label: "Create catch-up task",
            variant: "default",
            payload: {
              title: "Clear overdue backlog",
              description: `Follow up on ${overdueTasks.length} overdue task${
                overdueTasks.length > 1 ? "s" : ""
              } surfaced by the AI Actions Feed.`,
              priority: overdueTasks.length >= 5 ? "urgent" : "high",
              dueDateOffsetDays: 1,
            },
          },
          {
            type: "open_route",
            label: "Open tasks",
            variant: "outline",
            payload: { path: "/tasks" },
          },
        ],
        timestamp: oldest.due_date ?? undefined,
        score: overdueTasks.length,
      });
    }

    const dueSoonTasks = tasks.filter((task) => {
      if (!task.due_date || isTaskClosed(task.status)) return false;
      const due = new Date(task.due_date);
      if (due < now) return false;
      return differenceInCalendarDays(due, now) <= 3;
    });

    if (dueSoonTasks.length > 0) {
      const nextDue = [...dueSoonTasks].sort(
        (a, b) =>
          new Date(a.due_date ?? "").getTime() -
          new Date(b.due_date ?? "").getTime(),
      )[0];
      const relative = formatRelative(nextDue.due_date);
      itemsAccumulator.push({
        id: "tasks-due-soon",
        title: `Prep for ${dueSoonTasks.length} task${dueSoonTasks.length > 1 ? "s" : ""} due soon`,
        description:
          relative && nextDue.title
            ? `"${nextDue.title}" due ${relative}. Bundle follow-ups to stay ahead.`
            : "Upcoming tasks are approaching their deadlines.",
        severity: "medium",
        source: "tasks",
        details: dueSoonTasks.slice(0, 3).map((task) => {
          const rel = formatRelative(task.due_date);
          return `${task.title ?? "Untitled task"}${rel ? ` • due ${rel}` : ""}`;
        }),
        actions: [
          {
            type: "create_task",
            label: "Plan next sprint",
            variant: "default",
            payload: {
              title: "Plan for upcoming task deadlines",
              description: `Coordinate owners and blockers for ${dueSoonTasks.length} upcoming task${
                dueSoonTasks.length > 1 ? "s" : ""
              }.`,
              priority: "medium",
              dueDateOffsetDays: 2,
            },
          },
          {
            type: "open_route",
            label: "Review tasks",
            variant: "outline",
            payload: { path: "/tasks" },
          },
        ],
        timestamp: nextDue.due_date ?? undefined,
        score: dueSoonTasks.length,
      });
    }

    const atRiskGoals = goals.filter((goal) => {
      if (goal.status !== "active") return false;
      if (!goal.target_completion_date) return false;
      const due = new Date(goal.target_completion_date);
      if (Number.isNaN(due.getTime())) return false;
      const progress = calculateGoalProgress(goal);
      if (due < now) return progress < 100;
      if (due > upcomingThreshold) return false;
      return progress < 70;
    });

    if (atRiskGoals.length > 0) {
      const overdueGoals = atRiskGoals.filter(
        (goal) =>
          goal.target_completion_date &&
          new Date(goal.target_completion_date) < now,
      );
      const severity: FeedSeverity =
        overdueGoals.length > 0 ? "high" : "medium";
      const headlineGoal = overdueGoals[0] ?? atRiskGoals[0];
      const dueRelative = formatRelative(headlineGoal.target_completion_date);
      itemsAccumulator.push({
        id: "goals-at-risk",
        title: `${atRiskGoals.length} goal${atRiskGoals.length > 1 ? "s" : ""} ${overdueGoals.length > 0 ? "overdue" : "at risk"}`,
        description:
          dueRelative && headlineGoal.title
            ? `"${headlineGoal.title}" tracking ${calculateGoalProgress(headlineGoal)}% ${
                overdueGoals.length > 0 ? "past due" : "with a looming deadline"
              } (${dueRelative}).`
            : "Key objectives need course correction to stay on target.",
        severity,
        source: "goals",
        details: atRiskGoals.slice(0, 3).map((goal) => {
          const rel = formatRelative(goal.target_completion_date);
          const progress = calculateGoalProgress(goal);
          return `${goal.title ?? "Untitled goal"} • ${progress}%${rel ? ` • due ${rel}` : ""}`;
        }),
        actions: [
          {
            type: "create_task",
            label: "Schedule goal sync",
            variant: "default",
            payload: {
              title: "Goal recovery session",
              description: `Bring stakeholders together to unblock ${atRiskGoals.length} goal${
                atRiskGoals.length > 1 ? "s" : ""
              } trending behind.`,
              priority: overdueGoals.length > 0 ? "high" : "medium",
              dueDateOffsetDays: overdueGoals.length > 0 ? 1 : 3,
            },
          },
          {
            type: "open_route",
            label: "Open goals",
            variant: "outline",
            payload: { path: "/goals" },
          },
        ],
        timestamp: headlineGoal.target_completion_date ?? undefined,
        score: atRiskGoals.length,
      });
    }

    const pendingReminders = reminders.filter(
      (reminder) => !reminder.completed,
    );
    const overdueReminders = pendingReminders.filter(
      (reminder) => reminder.remind_at && new Date(reminder.remind_at) < now,
    );
    if (overdueReminders.length > 0) {
      const headline = [...overdueReminders].sort(
        (a, b) =>
          new Date(a.remind_at ?? "").getTime() -
          new Date(b.remind_at ?? "").getTime(),
      )[0];
      const relative = formatRelative(headline.remind_at);
      itemsAccumulator.push({
        id: "reminders-overdue",
        title: `Clear ${overdueReminders.length} overdue reminder${overdueReminders.length > 1 ? "s" : ""}`,
        description:
          relative && headline.title
            ? `"${headline.title}" slipped ${relative}. Close the loop or snooze with context.`
            : "Some reminders have passed without acknowledgement.",
        severity: "medium",
        source: "reminders",
        details: overdueReminders.slice(0, 3).map((reminder) => {
          const rel = formatRelative(reminder.remind_at);
          return `${reminder.title}${rel ? ` • ${rel}` : ""}`;
        }),
        actions: [
          {
            type: "complete_reminder",
            label: "Mark done",
            variant: "default",
            payload: { reminderId: headline.id },
          },
          {
            type: "snooze_reminder",
            label: "Snooze 15m",
            variant: "outline",
            payload: { reminderId: headline.id, minutes: 15 },
          },
        ],
        timestamp: headline.remind_at ?? undefined,
        score: overdueReminders.length,
      });
    } else {
      const imminentReminder = pendingReminders
        .filter(
          (reminder) =>
            reminder.remind_at &&
            differenceInMinutes(new Date(reminder.remind_at), now) <= 60,
        )
        .sort(
          (a, b) =>
            new Date(a.remind_at ?? "").getTime() -
            new Date(b.remind_at ?? "").getTime(),
        )[0];

      if (imminentReminder) {
        const relative = formatRelative(imminentReminder.remind_at);
        itemsAccumulator.push({
          id: "reminders-upcoming",
          title: `Reminder "${imminentReminder.title}" approaching`,
          description: relative
            ? `Scheduled ${relative}. Confirm next steps or defer.`
            : "Reminder coming due shortly.",
          severity: "low",
          source: "reminders",
          details: [
            `Priority ${imminentReminder.priority}`,
            `Channel: ${imminentReminder.type ?? "general"}`,
          ],
          actions: [
            {
              type: "complete_reminder",
              label: "Mark done",
              variant: "default",
              payload: { reminderId: imminentReminder.id },
            },
            {
              type: "snooze_reminder",
              label: "Snooze 15m",
              variant: "outline",
              payload: { reminderId: imminentReminder.id, minutes: 15 },
            },
          ],
          timestamp: imminentReminder.remind_at ?? undefined,
          score: 1,
        });
      }
    }

    if (unreadCount > 0) {
      const newestNotification = notifications?.[0];
      itemsAccumulator.push({
        id: "notifications-unread",
        title: `${unreadCount} notification${unreadCount > 1 ? "s need" : " needs"} review`,
        description: newestNotification?.title
          ? `Latest: ${newestNotification.title}. Clear the queue to keep automations timely.`
          : "Unread updates are waiting for acknowledgement.",
        severity: unreadCount > 5 ? "medium" : "low",
        source: "notifications",
        details: notifications?.slice(0, 3).map((notification) => {
          const rel = formatRelative(notification.created_at);
          return `${notification.title}${rel ? ` • ${rel}` : ""}`;
        }),
        actions: [
          {
            type: "mark_notifications_read",
            label: "Mark all read",
            variant: "default",
          },
          {
            type: "open_route",
            label: "Go to tasks",
            variant: "outline",
            payload: { path: "/tasks" },
          },
        ],
        timestamp: newestNotification?.created_at ?? undefined,
        score: unreadCount,
      });
    }

    const horizon = addDays(now, 3);
    const shiftCoverageGaps = shifts
      .map((shift) => {
        if (!shift.start_time) return null;
        const shiftStart = new Date(shift.start_time);
        if (Number.isNaN(shiftStart.getTime())) return null;
        if (shiftStart < now || shiftStart > horizon) return null;
        const required = shift.required_headcount ?? 1;
        const assigned = (shift.assignments ?? []).filter(
          (assignment) => assignment?.status !== "cancelled",
        ).length;
        const gap = required - assigned;
        if (gap <= 0) return null;
        return { shift, gap, shiftStart };
      })
      .filter(
        (
          entry,
        ): entry is {
          shift: (typeof shifts)[number];
          gap: number;
          shiftStart: Date;
        } => Boolean(entry),
      );

    if (shiftCoverageGaps.length > 0) {
      const topGap = shiftCoverageGaps.sort(
        (a, b) => (b?.gap ?? 0) - (a?.gap ?? 0),
      )[0]!;
      const relative = formatRelative(topGap.shift.start_time ?? undefined);
      itemsAccumulator.push({
        id: "scheduling-gaps",
        title: `Coverage gap for ${shiftCoverageGaps.length} upcoming shift${
          shiftCoverageGaps.length > 1 ? "s" : ""
        }`,
        description:
          relative && topGap.shift.title
            ? `${topGap.shift.title} short ${topGap.gap} teammate${topGap.gap > 1 ? "s" : ""} (${relative}).`
            : "Upcoming shifts are understaffed based on required headcount.",
        severity:
          shiftCoverageGaps.length > 1 || topGap.gap > 1 ? "high" : "medium",
        source: "scheduling",
        details: shiftCoverageGaps.slice(0, 3).map((gapEntry) => {
          const rel = formatRelative(gapEntry!.shift.start_time ?? undefined);
          const role = gapEntry!.shift.role ?? gapEntry!.shift.title ?? "Shift";
          return `${role} • short ${gapEntry!.gap}${rel ? ` • ${rel}` : ""}`;
        }),
        actions: [
          {
            type: "create_task",
            label: "Create coverage task",
            variant: "default",
            payload: {
              title: `Fill shift gap: ${topGap.shift.title ?? "Shift"}`,
              description: `Backfill ${topGap.gap} spot${topGap.gap > 1 ? "s" : ""} for ${topGap.shift.title ?? "upcoming shift"} on ${
                relative ?? "upcoming schedule"
              }.`,
              priority: "high",
              dueDateOffsetDays: 1,
            },
          },
          {
            type: "open_route",
            label: "View schedule",
            variant: "outline",
            payload: { path: "/schedule" },
          },
        ],
        timestamp: topGap.shift.start_time ?? undefined,
        score: shiftCoverageGaps.length + topGap.gap,
      });
    }

    const lastWeekStart = subDays(now, 7);
    const previousWeekStart = subDays(now, 14);

    const expensesByWindow = (start: Date, end: Date) =>
      expenses.filter((expense) => {
        const expenseDate = normalizeExpenseDate(expense);
        if (!expenseDate) return false;
        return expenseDate >= start && expenseDate < end;
      });

    const lastWeekExpenses = expensesByWindow(lastWeekStart, now);
    const previousWeekExpenses = expensesByWindow(
      previousWeekStart,
      lastWeekStart,
    );

    const sumExpenses = (list: Expense[]) =>
      list.reduce((sum, expense) => sum + (expense.amount ?? 0), 0);

    const lastWeekTotal = sumExpenses(lastWeekExpenses);
    const previousWeekTotal = sumExpenses(previousWeekExpenses);
    const delta = lastWeekTotal - previousWeekTotal;
    const pctChange =
      previousWeekTotal > 0
        ? Math.round(
            ((lastWeekTotal - previousWeekTotal) / previousWeekTotal) * 100,
          )
        : null;

    const significantSpike =
      (pctChange !== null && pctChange >= 25 && lastWeekTotal > 0) ||
      (previousWeekTotal === 0 && lastWeekTotal >= 500);

    if (significantSpike) {
      const categoryTotals = lastWeekExpenses.reduce<Record<string, number>>(
        (acc, expense) => {
          const key = expense.category ?? "Uncategorised";
          acc[key] = (acc[key] ?? 0) + (expense.amount ?? 0);
          return acc;
        },
        {},
      );

      const topCategory = Object.entries(categoryTotals).sort(
        (a, b) => b[1] - a[1],
      )[0];
      const categoryLabel = topCategory
        ? `${topCategory[0]} ($${topCategory[1].toFixed(0)})`
        : "Mixed categories";

      itemsAccumulator.push({
        id: "expenses-spike",
        title: "Cost spike detected in last 7 days",
        description:
          pctChange !== null
            ? `Spend up ${pctChange}% week-over-week (${delta >= 0 ? "+" : ""}$${delta.toFixed(0)}). Largest impact: ${categoryLabel}.`
            : `Spend of $${lastWeekTotal.toFixed(
                0,
              )} recorded this week with no prior baseline. Investigate ${categoryLabel}.`,
        severity: pctChange !== null && pctChange >= 40 ? "high" : "medium",
        source: "expenses",
        details: [
          `Last 7 days: $${lastWeekTotal.toFixed(0)}`,
          `Previous 7 days: $${previousWeekTotal.toFixed(0)}`,
          `Top category: ${categoryLabel}`,
        ],
        actions: [
          {
            type: "create_task",
            label: "Launch cost review",
            variant: "default",
            payload: {
              title: "Review expense spike",
              description: `Validate unusual spend pattern (${pctChange ?? "100"}% increase) and coordinate corrective actions.`,
              priority: "high",
              dueDateOffsetDays: 2,
            },
          },
          {
            type: "open_route",
            label: "Open expenses",
            variant: "outline",
            payload: { path: "/expenses" },
          },
        ],
        timestamp: lastWeekExpenses[0]?.created_at ?? undefined,
        score: pctChange ?? lastWeekTotal,
      });
    }

    itemsAccumulator.sort((a, b) => {
      const severityDiff = severityRank[b.severity] - severityRank[a.severity];
      if (severityDiff !== 0) return severityDiff;
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      if (b.timestamp && a.timestamp) {
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      return 0;
    });

    return itemsAccumulator.slice(0, 8);
  }, [
    hasCompanyContext,
    tasks,
    goals,
    calculateGoalProgress,
    reminders,
    notifications,
    unreadCount,
    shifts,
    expenses,
  ]);

  const refresh = useCallback(async () => {
    const refreshPromises: Array<Promise<unknown> | undefined> = [
      refetchTasks?.(),
      refetchGoals?.(),
      refetchReminders?.(),
      refetchNotifications?.(),
    ];

    if (hasCompanyContext) {
      refreshPromises.push(refetchScheduling());
      if (refetchExpenses) {
        refreshPromises.push(refetchExpenses());
      }
    }

    const settledPromises = refreshPromises.filter(
      (promise): promise is Promise<unknown> => promise !== undefined,
    );

    if (settledPromises.length > 0) {
      await Promise.allSettled(settledPromises);
    }
  }, [
    hasCompanyContext,
    refetchTasks,
    refetchGoals,
    refetchReminders,
    refetchNotifications,
    refetchScheduling,
    refetchExpenses,
  ]);

  const schedulingLoadingEffective = hasCompanyContext
    ? schedulingLoading
    : false;
  const expensesLoadingEffective = hasCompanyContext
    ? expensesQuery.isLoading
    : false;

  const loading =
    profileLoading ||
    tasksLoading ||
    goalsLoading ||
    remindersLoading ||
    notificationsLoading ||
    schedulingLoadingEffective ||
    expensesLoadingEffective;

  return {
    items,
    loading,
    refresh,
    createTask,
    markReminderCompleted,
    snoozeReminder,
    markNotificationsRead: markAllAsRead,
    refetchNotifications,
    refetchReminders,
    refetchTasks,
    refetchGoals,
    refetchExpenses: refetchExpenses,
    schedulingFallback: hasCompanyContext ? isUsingFallbackData : false,
  };
}
