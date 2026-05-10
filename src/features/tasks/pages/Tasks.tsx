import React, { Suspense, lazy, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useTasks, type TaskWithRelations } from "@/hooks/useTasks";
import { asArray } from "@/utils/reactQueryTypes";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskNotifications } from "@/features/tasks/components/TaskNotifications";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  TaskPageSkeleton,
  ActivityFeedSkeleton,
  ReminderListSkeleton,
} from "@/components/loading/TaskSkeletons";
import { useTaskFilters, useTaskSelection } from "@/features/tasks";
import type {
  TaskStatusFilter,
  TaskPriorityFilter,
} from "@/features/tasks/types/filters";
import { calculateTaskMetrics } from "@/features/tasks/utils/taskMetrics";
import { filterTasks } from "@/features/tasks/utils/taskFiltering";
import { generateStatusTabs } from "@/features/tasks/utils/statusTabs";
import { generatePriorityOptions } from "@/features/tasks/utils";
import { calculateDueBadge } from "@/features/tasks/utils/dueDateHelpers";
import {
  TaskMetricsCards,
  TaskFilters,
  TaskStatusTabs,
  TaskCard,
  TaskEmptyState,
} from "@/features/tasks/components";

const CreateTaskDialog = lazy(() =>
  import("@/features/tasks/components/CreateTaskDialog").then((module) => ({
    default: module.CreateTaskDialog,
  })),
);

const TaskDetailsDialog = lazy(() =>
  import("@/features/tasks/components/TaskDetailsDialog").then((module) => ({
    default: module.TaskDetailsDialog,
  })),
);

const TaskActivityFeed = lazy(() =>
  import("@/features/tasks/components/TaskActivityFeed").then((module) => ({
    default: module.TaskActivityFeed,
  })),
);

const RemindersPanel = lazy(() =>
  import("@/features/tasks/components/reminders/RemindersPanel").then((module) => ({
    default: module.RemindersPanel,
  })),
);

export default function Tasks() {
  const isMobile = useIsMobile();
  const { tasks: tasksData, loading, error, refetchTasks } = useTasks();
  const tasks = asArray(tasksData);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const {
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    searchTerm,
    setSearchTerm,
    filtersActive,
    resetFilters,
  } = useTaskFilters<TaskStatusFilter, TaskPriorityFilter>();
  const {
    selectedTask,
    highlightedTaskId,
    openTask,
    closeTask,
    handleNotificationNavigate,
    getSelectionHandlers,
  } = useTaskSelection<TaskWithRelations>(tasks);

  const totalTasks = tasks.length;

  const metrics = useMemo(() => calculateTaskMetrics(tasks), [tasks]);

  const statusTabs = useMemo(
    () => generateStatusTabs(tasks, totalTasks),
    [tasks, totalTasks],
  );

  const priorityOptions = useMemo(
    () => generatePriorityOptions(tasks),
    [tasks],
  );

  const filteredTasks = useMemo(
    () => filterTasks(tasks, statusFilter, priorityFilter, searchTerm),
    [tasks, statusFilter, priorityFilter, searchTerm],
  );

  const handleResetFilters = resetFilters;

  if (loading) {
    return <TaskPageSkeleton isMobile={isMobile} />;
  }

  return (
    <div
      data-testid="tasks-page"
      className={
        isMobile
          ? "space-y-4 px-4 pb-6"
          : "space-y-6 max-w-7xl mx-auto px-6 pb-10"
      }
    >
      <div
        className={
          isMobile
            ? "flex flex-col space-y-3"
            : "flex items-center justify-between gap-6"
        }
      >
        <div className="space-y-1">
          <h1
            className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold tracking-tight`}
          >
            Tasks
          </h1>
          <p className="text-muted-foreground">
            Manage and track work across your projects with filters built for
            quick focus.
          </p>
        </div>
        <div
          className={
            isMobile
              ? "flex items-center justify-between"
              : "flex items-center gap-3"
          }
        >
          <TaskNotifications onTaskNavigate={handleNotificationNavigate} />
          <Button
            data-testid="tasks-create-button"
            onClick={() => setShowCreateDialog(true)}
            size={isMobile ? "sm" : "default"}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isMobile ? "New" : "Create Task"}
          </Button>
        </div>
      </div>

      {!loading && error && (
        <Alert
          variant="destructive"
          data-testid="tasks-error"
          className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
          <AlertTitle>Unable to load tasks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchTasks()}
            data-testid="tasks-retry-button"
          >
            Retry
          </Button>
        </Alert>
      )}

      <TaskMetricsCards metrics={metrics} />

      <Card className="border-dashed">
        <CardContent className={isMobile ? "space-y-4 p-4" : "space-y-4 p-5"}>
          <TaskFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            priorityOptions={priorityOptions}
            filtersActive={filtersActive}
            onResetFilters={handleResetFilters}
          />

          <TaskStatusTabs
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusTabs={statusTabs}
          />
        </CardContent>
      </Card>

      <div
        className={
          isMobile ? "space-y-4" : "grid grid-cols-1 gap-6 lg:grid-cols-3"
        }
      >
        <div className={isMobile ? "space-y-3" : "space-y-4 lg:col-span-2"}>
          {tasks.length === 0 || filteredTasks.length === 0 ? (
            <TaskEmptyState
              hasTasks={tasks.length > 0}
              onCreateTask={() => setShowCreateDialog(true)}
              onResetFilters={handleResetFilters}
            />
          ) : (
            <div data-testid="tasks-list" className="space-y-4">
              {filteredTasks.map((task) => {
                const dueBadge = calculateDueBadge(task);
                const selectionHandlers = getSelectionHandlers(task.id);

                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dueBadge={dueBadge}
                    highlighted={highlightedTaskId === task.id}
                    selectionHandlers={selectionHandlers}
                  />
                );
              })}
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="space-y-6 lg:sticky lg:top-24">
            <Suspense fallback={<ReminderListSkeleton />}>
              <RemindersPanel />
            </Suspense>
            <Suspense fallback={<ActivityFeedSkeleton />}>
              <TaskActivityFeed />
            </Suspense>
          </div>
        )}
      </div>

      {/* Mobile-only panels */}
      {isMobile && (
        <div className="space-y-4">
          <Suspense fallback={<ReminderListSkeleton />}>
            <RemindersPanel />
          </Suspense>
          <Suspense fallback={<ActivityFeedSkeleton />}>
            <TaskActivityFeed />
          </Suspense>
        </div>
      )}

      <Suspense fallback={null}>
        {showCreateDialog && (
          <CreateTaskDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
          />
        )}
      </Suspense>

      {selectedTask && (
        <Suspense fallback={null}>
          <TaskDetailsDialog
            task={selectedTask}
            open={!!selectedTask}
            onClose={closeTask}
            onTaskUpdate={(updatedTask) => openTask(updatedTask.id)}
          />
        </Suspense>
      )}
    </div>
  );
}
