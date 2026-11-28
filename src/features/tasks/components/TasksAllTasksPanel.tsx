import { Suspense, lazy } from "react";
import type { TaskWithRelations } from "@/hooks/useTasks";
import type {
  TaskPriorityFilter,
  TaskStatusFilter,
} from "@/features/tasks/types/filters";
import type { StatusTabItem } from "@/features/tasks/utils/statusTabLayout";
import type { ReadinessFilter } from "@/features/tasks/utils/readinessFilters";
import type { TaskKindFilter } from "@/features/tasks/utils/taskKind";
import type { TaskSortKey } from "@/features/tasks/utils/taskListSort";
import type { DueBadge } from "../types/filters";
import type { TaskContentTranslation } from "../taskContentFields";
import type { SelectionHandlers } from "../hooks/useTaskSelection";
import { TaskViewSection } from "./TaskViewSection";
import { TaskExecutionReadinessPanel } from "./TaskExecutionReadinessPanel";
import { TaskCard } from "./TaskCard";
import { TaskMobileListRow } from "./TaskMobileListRow";
import { TaskEmptyState } from "./TaskEmptyState";
import {
  ActivityFeedSkeleton,
  ReminderListSkeleton,
} from "@/components/loading/TaskSkeletons";

const RemindersPanel = lazy(() =>
  import("@/features/tasks/components/reminders/RemindersPanel").then((module) => ({
    default: module.RemindersPanel,
  })),
);

const TaskActivityFeed = lazy(() =>
  import("@/features/tasks/components/TaskActivityFeed").then((module) => ({
    default: module.TaskActivityFeed,
  })),
);

type TaskListItem = TaskWithRelations & { id: string };

interface TasksAllTasksPanelProps {
  isMobile: boolean;
  shopTimeZone: string;
  visibleCount: number;
  listedTasks: TaskListItem[];
  statusScopedTasks: TaskListItem[];
  statusFilter: TaskStatusFilter;
  onStatusChange: (value: TaskStatusFilter) => void;
  statusTabs: StatusTabItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: TaskPriorityFilter;
  onPriorityChange: (value: TaskPriorityFilter) => void;
  priorityOptions: Array<{ value: TaskPriorityFilter; label: string }>;
  kindFilter: TaskKindFilter;
  onKindChange: (value: TaskKindFilter) => void;
  filtersActive: boolean;
  onResetFilters: () => void;
  readinessFilter: ReadinessFilter | null;
  onReadinessFilterChange: (value: ReadinessFilter | null) => void;
  readinessCounts: Record<ReadinessFilter, number>;
  sort: TaskSortKey;
  onSortChange: (value: TaskSortKey) => void;
  highlightedTaskId: string | null;
  translations: Map<string, TaskContentTranslation | null>;
  getSelectionHandlers: (taskId: string) => SelectionHandlers;
  getDueBadge: (task: TaskListItem) => DueBadge | null;
  onOpenTask: (taskId: string) => void;
  onFillForm: (formId: string) => void;
  onComplete: (taskId: string) => void;
}

export function TasksAllTasksPanel({
  isMobile,
  shopTimeZone,
  visibleCount,
  listedTasks,
  statusScopedTasks,
  statusFilter,
  onStatusChange,
  statusTabs,
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  priorityOptions,
  kindFilter,
  onKindChange,
  filtersActive,
  onResetFilters,
  readinessFilter,
  onReadinessFilterChange,
  readinessCounts,
  sort,
  onSortChange,
  highlightedTaskId,
  translations,
  getSelectionHandlers,
  getDueBadge,
  onOpenTask,
  onFillForm,
  onComplete,
}: TasksAllTasksPanelProps) {
  return (
  <div className="space-y-4">
    <div
      className={
        isMobile
          ? "sticky top-0 z-20 -mx-4 space-y-3 border-b border-border bg-background/95 px-4 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          : "space-y-4"
      }
      data-testid="tasks-all-sticky"
    >
      <TaskViewSection
        isMobile={isMobile}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        statusTabs={statusTabs}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        priorityFilter={priorityFilter}
        onPriorityChange={onPriorityChange}
        priorityOptions={priorityOptions}
        kindFilter={kindFilter}
        onKindChange={onKindChange}
        filtersActive={filtersActive}
        onResetFilters={onResetFilters}
        readinessFilter={readinessFilter}
        onReadinessFilterChange={onReadinessFilterChange}
        readinessCounts={readinessCounts}
        sort={sort}
        onSortChange={onSortChange}
      />
    </div>

    <TaskExecutionReadinessPanel tasks={statusScopedTasks} onOpenTask={onOpenTask} />

    {visibleCount === 0 || listedTasks.length === 0 ? (
      <TaskEmptyState
        hasTasks={visibleCount > 0}
        onResetFilters={onResetFilters}
      />
    ) : (
      <div
        data-testid="tasks-list"
        className={isMobile ? "space-y-2" : "space-y-4"}
        data-mobile-layout={isMobile ? "compact" : "card"}
      >
        {listedTasks.map((task) => {
          const dueBadge = getDueBadge(task);
          const selectionHandlers = getSelectionHandlers(task.id);
          if (isMobile) {
            return (
              <TaskMobileListRow
                key={task.id}
                task={task}
                dueBadge={dueBadge}
                highlighted={highlightedTaskId === task.id}
                selectionHandlers={selectionHandlers}
                timeZone={shopTimeZone}
                onComplete={onComplete}
              />
            );
          }
          return (
            <TaskCard
              key={task.id}
              task={task}
              dueBadge={dueBadge}
              highlighted={highlightedTaskId === task.id}
              selectionHandlers={selectionHandlers}
              translation={translations.get(task.id) ?? null}
              timeZone={shopTimeZone}
              onFillForm={onFillForm}
              onComplete={onComplete}
            />
          );
        })}
      </div>
    )}

    <div
      className={
        isMobile
          ? "space-y-4"
          : "grid grid-cols-1 gap-4 lg:grid-cols-2"
      }
      data-testid="tasks-below-list"
    >
      <Suspense fallback={<ReminderListSkeleton />}>
        <RemindersPanel />
      </Suspense>
      <Suspense fallback={<ActivityFeedSkeleton />}>
        <TaskActivityFeed />
      </Suspense>
    </div>
  </div>
  );
}