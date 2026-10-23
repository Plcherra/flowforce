import { useTranslation } from "react-i18next";
import React, { Suspense, lazy, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTasks, type TaskWithRelations } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
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
import { filterTasks } from "@/features/tasks/utils/taskFiltering";
import { generateStatusTabs } from "@/features/tasks/utils/statusTabs";
import { generatePriorityOptions } from "@/features/tasks/utils";
import { calculateDueBadge } from "@/features/tasks/utils/dueDateHelpers";
import {
  applyReadinessFilter,
  readinessCounts,
  type ReadinessFilter,
} from "@/features/tasks/utils/readinessFilters";
import { useCan } from "@/hooks/useCan";
import { taskCreateLevel } from "@/features/tasks/utils/taskCreateLevel";
import { taskCreateKeysAreSet } from "@/features/tasks/utils/taskCreateAccess";
import { isTaskListedForViewer } from "@/features/tasks/utils/taskSchedule";
import type { TaskKindFilter } from "@/features/tasks/utils/taskKind";
import { TaskCard, TaskEmptyState } from "@/features/tasks/components";
import { useTaskContentTranslations } from "@/features/tasks/hooks/useTaskContentTranslations";
import { TaskExecutionReadinessPanel } from "@/features/tasks/components/TaskExecutionReadinessPanel";
import { TaskViewSection } from "@/features/tasks/components/TaskViewSection";
import { TaskCreateMenu } from "@/features/tasks/components/TaskCreateMenu";
import { ListIssueSync } from "@/features/tasks/components/ListIssueSync";
import { ListIssueGather } from "@/features/tasks/components/ListIssueGather";
import { DraftInbox } from "@/features/tasks/components/DraftInbox";
import { WeekdayTaskSetup } from "@/features/tasks/components/WeekdayTaskSetup";
import { MyShiftTasks } from "@/features/tasks/components/MyShiftTasks";
import { TodayShiftMonitor } from "@/features/tasks/components/TodayShiftMonitor";
import { TasksBoardSwitch } from "@/features/tasks/components/TasksBoardSwitch";
import { useMyShiftBoard } from "@/features/tasks/hooks/useMyShiftBoard";
import { useTaskAssigneeScope } from "@/features/tasks/hooks/useTaskAssigneeScope";

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

const FormFillDialog = lazy(() => import("@/features/forms/components/FormFillDialog"));

type TaskListItem = TaskWithRelations & { id: string };

export default function Tasks() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { can, getSource, isLoading: permissionsLoading } = useCan();
  const customCreateLevel = taskCreateLevel({
    createOthers: can("tasks.custom.create_others"),
    createSelf: can("tasks.custom.create_self"),
    legacyEdit: can("editTasks"),
    keysSet: taskCreateKeysAreSet("custom", getSource),
  });
  const showCreateMenu = permissionsLoading || customCreateLevel !== "none";
  const showSetup = !permissionsLoading && can("editTasks");
  const showDrafts =
    !permissionsLoading && (can("editTasks") || can("ai.actions.approve"));
  const { user } = useAuth();
  const { tasks: tasksData, loading, error, refetchTasks, updateTask } = useTasks();
  const tasks = useMemo(
    () => asArray(tasksData) as TaskListItem[],
    [tasksData],
  );
  const translations = useTaskContentTranslations(tasks);
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) =>
        isTaskListedForViewer(task, user?.id ?? null),
      ),
    [tasks, user?.id],
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [boardMode, setBoardMode] = useState<"shift" | "all" | "setup">("shift");
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const shift = useMyShiftBoard(visibleTasks);
  const assigneeScope = useTaskAssigneeScope();
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter | null>(
    null,
  );
  const [kindFilter, setKindFilter] = useState<TaskKindFilter>("all");
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
  } = useTaskSelection<TaskListItem>(visibleTasks);

  const totalTasks = visibleTasks.length;

  const statusTabs = useMemo(
    () => generateStatusTabs(visibleTasks, totalTasks),
    [visibleTasks, totalTasks],
  );

  const priorityOptions = useMemo(
    () => generatePriorityOptions(visibleTasks),
    [visibleTasks],
  );

  const statusScopedTasks = useMemo(
    () => filterTasks(visibleTasks, statusFilter, "all", "") as TaskListItem[],
    [visibleTasks, statusFilter],
  );

  const filteredTasks = useMemo(
    () =>
      filterTasks(
        visibleTasks,
        statusFilter,
        priorityFilter,
        searchTerm,
        kindFilter,
      ) as TaskListItem[],
    [visibleTasks, statusFilter, priorityFilter, searchTerm, kindFilter],
  );

  const listedTasks = useMemo(
    () => applyReadinessFilter(filteredTasks, readinessFilter),
    [filteredTasks, readinessFilter],
  );

  const viewReadinessCounts = useMemo(
    () => readinessCounts(statusScopedTasks),
    [statusScopedTasks],
  );

  const handleResetFilters = () => {
    resetFilters();
    setReadinessFilter(null);
    setKindFilter("all");
  };
  const filtersAreActive =
    filtersActive || readinessFilter !== null || kindFilter !== "all";

  if (loading) {
    return <TaskPageSkeleton isMobile={isMobile} />;
  }

  return (
    <div
      data-testid="tasks-page"
      className={
        isMobile
          ? "space-y-4 px-4 pb-6"
          : "w-full space-y-6 px-6 pb-10"
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
            {t("tasks.tasks")}
          </h1>
          <p className="text-muted-foreground">
            {"Today's work, including tasks that came from a shift."}
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
        </div>
      </div>

      <TasksBoardSwitch mode={boardMode} showSetup={showSetup} onChange={setBoardMode} />
      <ListIssueSync />
      {boardMode === "setup" && showSetup ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{t("tasks.listsLiveOnForms")}</p>
          <WeekdayTaskSetup />
        </div>
      ) : null}
      {boardMode === "shift" && can("editTasks") ? <TodayShiftMonitor /> : null}
      {boardMode === "shift" && showDrafts ? <DraftInbox tasks={visibleTasks} /> : null}
      {boardMode === "shift" ? (
        <MyShiftTasks
          board={shift.board}
          onOpenList={setOpenFormId}
          onToggleItem={shift.toggleItem}
          onSaveClosingNote={shift.saveClosingNote}
        />
      ) : null}
      {boardMode === "all" ? (
        <ListIssueGather
          tasks={tasks}
          onMarkDone={(taskId) => {
            void updateTask(taskId, { status: "completed" }).then(() => refetchTasks());
          }}
        />
      ) : null}

      {!loading && error && (
        <Alert
          variant="destructive"
          data-testid="tasks-error"
          className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
          <AlertTitle>{t("tasks.unableToLoadTasks")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchTasks()}
            data-testid="tasks-retry-button"
          >
            {t("tasks.retry")}
          </Button>
        </Alert>
      )}

      {boardMode === "all" ? (
      <TaskViewSection
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusTabs={statusTabs}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        priorityOptions={priorityOptions}
        kindFilter={kindFilter}
        onKindChange={setKindFilter}
        filtersActive={filtersAreActive}
        onResetFilters={handleResetFilters}
        readinessFilter={readinessFilter}
        onReadinessFilterChange={setReadinessFilter}
        readinessCounts={viewReadinessCounts}
      />
      ) : null}

      {boardMode === "all" ? (
      <TaskExecutionReadinessPanel
        tasks={statusScopedTasks}
        onOpenTask={openTask}
      />
      ) : null}
      {showCreateMenu ? (
        <TaskCreateMenu onCreateCustom={() => setShowCreateDialog(true)} />
      ) : null}

      {boardMode === "all" ? (
      <div className="space-y-4">
        {visibleTasks.length === 0 || listedTasks.length === 0 ? (
          <TaskEmptyState
            hasTasks={visibleTasks.length > 0}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <div data-testid="tasks-list" className="space-y-4">
            {listedTasks.map((task) => {
              const dueBadge = calculateDueBadge(task);
              const selectionHandlers = getSelectionHandlers(task.id);

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  dueBadge={dueBadge}
                  highlighted={highlightedTaskId === task.id}
                  selectionHandlers={selectionHandlers}
                  translation={translations.get(task.id) ?? null}
                />
              );
            })}
          </div>
        )}

        <div
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
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
      ) : null}

      <Suspense fallback={null}>
        {openFormId ? (
          <FormFillDialog
            open
            formId={openFormId}
            onOpenChange={(next) => {
              if (!next) {
                setOpenFormId(null);
                shift.refresh();
              }
            }}
          />
        ) : null}
      </Suspense>

      <Suspense fallback={null}>
        {showCreateDialog && showCreateMenu && (
          <CreateTaskDialog
            open={showCreateDialog}
            createLevel={customCreateLevel === "self" ? "self" : "others"}
            scope={assigneeScope}
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
            translation={translations.get(selectedTask.id) ?? null}
          />
        </Suspense>
      )}
    </div>
  );
}
