import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  useTasks,
  TASK_STATUS_TRANSITIONS,
  normalizeTaskStatus,
  type TaskStatus as WorkflowStatus,
  type TaskWithRelations,
} from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { TaskTimeline } from "./TaskTimeline";
import { getTaskStatusBadgeClass } from "@/constants/taskStatus";
import { isOpenTaskStatus } from "@/features/tasks/utils/simpleTaskWorkflow";
import { readFormId } from "@/features/tasks/utils/shiftTaskWrite";
import {
  translatedKindLabel,
  translatedStatusLabel,
  workflowActionLabel,
} from "@/features/tasks/utils/taskCopy";
import { useTaskFormOptions } from "@/hooks/useTaskFormOptions";
import { TaskAudienceFields } from "@/features/tasks/components/TaskAudienceFields";
import {
  parseTaskAudience,
  taskAudienceJson,
  taskAudienceReady,
  type TaskAudience,
} from "@/features/tasks/utils/taskAudience";
import type { Json } from "@/integrations/supabase/public-types";
import {
  TaskDetailsExecutionCard,
  type TaskExecutionFormState,
} from "@/features/tasks/components/TaskDetailsExecutionCard";
import type { TaskDueByValue } from "@/features/tasks/components/TaskDueByFields";
import { buildDuePayload } from "@/features/tasks/utils/taskDueTiming";
import { useShopTimeZone } from "@/features/tasks/hooks/useShopTimeZone";
import {
  formatTaskDueLabel,
  readDueByFormState,
} from "@/features/tasks/utils/formatTaskDue";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { useTaskComments } from "@/features/tasks/hooks";
import {
  dueDateFromWindowEnd,
  fromDatetimeLocalValue,
  mergeTaskSchedule,
  readTaskSchedule,
  toDatetimeLocalValue,
  type TaskPublishState,
} from "@/features/tasks/utils/taskSchedule";
import { TaskDetailsCommentsPanel } from "@/features/tasks/components/TaskDetailsCommentsPanel";
import { logger } from "@/utils/logger";
import { readScheduleTaskLink } from "@/features/tasks/utils/scheduleTaskLink";
import { readTaskKind } from "@/features/tasks/utils/taskKind";
import { useFormContentDisplay } from "@/features/forms/components/FormContentText";
import { useTaskCommentTranslations } from "@/features/tasks/hooks/useTaskCommentTranslations";
import type { TaskContentTranslation } from "@/features/tasks/taskContentFields";
import { executionContentPatch } from "@/features/tasks/utils/executionUpdate";

type ButtonVariant = "default" | "secondary" | "outline";
interface TaskDetailsDialogProps {
  task: TaskWithRelations | null;
  open: boolean;
  onClose: () => void;
  onTaskUpdate?: (task: TaskWithRelations) => void;
  translation?: TaskContentTranslation | null;
  onFillForm?: (formId: string) => void;
}

const getPriorityColor = (priority?: string | null) => {
  switch (priority) {
    case "urgent":
      return "bg-destructive";
    case "high":
      return "bg-warning";
    case "medium":
      return "bg-warning";
    case "low":
      return "bg-success";
    default:
      return "bg-foreground";
  }
};

const getActionVariant = (
  _current: WorkflowStatus,
  target: WorkflowStatus,
): ButtonVariant => {
  if (target === "completed" || target === "done") return "default";
  if (target === "todo") return "secondary";
  return "outline";
};

export function TaskDetailsDialog({
  task,
  open,
  onClose,
  onTaskUpdate,
  translation = null,
  onFillForm,
}: TaskDetailsDialogProps) {
  const { t, i18n } = useTranslation();
  const shopTimeZone = useShopTimeZone();
  const language = appLanguageFromTag(i18n.language);
  const { user } = useAuth();
  const { can } = useCan();
  const canEdit = can("editTasks");
  const { updateStatus, updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const {
    assignees,
    loading: optionsLoading,
    positions,
    roles,
    departments,
  } = useTaskFormOptions(open);

  const [currentTask, setCurrentTask] = useState<TaskWithRelations | null>(
    task,
  );
  const [newComment, setNewComment] = useState("");
  const [pendingTarget, setPendingTarget] = useState<WorkflowStatus | null>(
    null,
  );
  const [assignmentValue, setAssignmentValue] = useState("none");
  const [viewAudience, setViewAudience] = useState<TaskAudience>(parseTaskAudience(null));
  const [editAudience, setEditAudience] = useState<TaskAudience>(parseTaskAudience(null));
  const [savingAudience, setSavingAudience] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [executionForm, setExecutionForm] = useState<TaskExecutionFormState>({
    title: "",
    description: "",
    priority: "medium",
    starts_at: "",
    ends_at: "",
    publish_state: "published",
  });
  const [savingExecution, setSavingExecution] = useState(false);
  const [dueBy, setDueBy] = useState<TaskDueByValue>({
    enabled: false,
    dateYmd: "",
    timeHm: "",
  });
  const [deletingTask, setDeletingTask] = useState(false);
  const {
    comments,
    loadingComments,
    commentsError,
    addingComment,
    submitComment,
    refreshComments,
  } = useTaskComments(currentTask, open);
  const commentTranslations = useTaskCommentTranslations(comments);
  const display = useFormContentDisplay({
    recordId: currentTask?.id,
    title: currentTask?.title ?? "",
    description: currentTask?.description,
    translation,
  });

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  useEffect(() => {
    const task = currentTask;
    if (!task) {
      setAssignmentValue("none");
      return;
    }

    setAssignmentValue(task.assigned_to ?? "none");
    const record = task as TaskWithRelations & {
      view_audience?: unknown;
      edit_audience?: unknown;
    };
    setViewAudience(parseTaskAudience(record.view_audience));
    setEditAudience(parseTaskAudience(record.edit_audience));
    const schedule = readTaskSchedule(task.links);
    setExecutionForm({
      title: task.title ?? "",
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      starts_at: toDatetimeLocalValue(schedule.startsAt),
      ends_at: toDatetimeLocalValue(schedule.endsAt),
      publish_state: schedule.publishState,
    });
    setDueBy(readDueByFormState(task, shopTimeZone));
  }, [currentTask, shopTimeZone]);

  const handleSaveExecution = async () => {
    if (!currentTask) return;

    const startsAt = fromDatetimeLocalValue(executionForm.starts_at);
    const endsAt = fromDatetimeLocalValue(executionForm.ends_at);
    if (!executionForm.title.trim()) {
      toast({ title: t("tasks.aTitleIsRequired"), variant: "destructive" });
      return;
    }
    if ((executionForm.starts_at || executionForm.ends_at) && (!startsAt || !endsAt)) {
      toast({
        title: t("tasks.windowIncomplete"),
        description: t("tasks.windowNeedsStartAndEnd"),
        variant: "destructive",
      });
      return;
    }
    if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      toast({
        title: t("tasks.windowIncomplete"),
        description: t("tasks.endMustBeAfterStart"),
        variant: "destructive",
      });
      return;
    }

    if (dueBy.enabled && (!dueBy.dateYmd.trim() || !dueBy.timeHm.trim())) {
      toast({
        title: t("tasks.dueByIncomplete"),
        variant: "destructive",
      });
      return;
    }

    setSavingExecution(true);
    try {
      const dueFields = buildDuePayload({
        dueByEnabled: dueBy.enabled,
        dueByDate: dueBy.dateYmd,
        dueByTime: dueBy.timeHm,
        timeZone: shopTimeZone,
        windowDueDate: dueDateFromWindowEnd(endsAt),
      });
      const { data, error } = await updateTask(currentTask.id, {
        ...executionContentPatch(currentTask, {
          title: executionForm.title,
          description: executionForm.description,
        }),
        priority: executionForm.priority,
        due_date: dueFields.due_date,
        due_at: dueFields.due_at,
        links: mergeTaskSchedule(currentTask.links, {
          startsAt,
          endsAt,
          publishState: executionForm.publish_state,
        }),
      });

      if (error || !data) {
        throw error ?? new Error(t("tasks.executionFailedHelp"));
      }

      const updatedTask: TaskWithRelations = {
        ...currentTask,
        ...data,
      };

      setCurrentTask(updatedTask);
      onTaskUpdate?.(updatedTask);
      toast({
        title: t("tasks.executionSaved"),
        description: t("tasks.executionSavedHelp"),
      });
    } catch (error) {
      logger.error("Error saving task execution details:", {
        error,
        tags: ["error"],
      });
      toast({
        title: t("tasks.executionFailed"),
        description: t("tasks.executionFailedHelp"),
        variant: "destructive",
      });
    } finally {
      setSavingExecution(false);
    }
  };

  const handleSaveAudience = async () => {
    if (!currentTask) return;
    if (!taskAudienceReady(viewAudience) || !taskAudienceReady(editAudience)) {
      toast({
        title: t("tasks.visibilitySaveFailed"),
        description: t("tasks.audienceNeedsAChoice"),
        variant: "destructive",
      });
      return;
    }
    setSavingAudience(true);
    try {
      const { data, error } = await updateTask(currentTask.id, {
        view_audience: taskAudienceJson(viewAudience) as Json,
        edit_audience: taskAudienceJson(editAudience) as Json,
      });
      if (error || !data) throw error ?? new Error("Unable to save visibility");
      const updatedTask = { ...currentTask, ...data };
      setCurrentTask(updatedTask);
      onTaskUpdate?.(updatedTask);
      toast({ title: t("tasks.visibilitySaved") });
    } catch (error) {
      logger.error("Error saving task visibility", { error, tags: ["error"] });
      toast({
        title: t("tasks.visibilitySaveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingAudience(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask) return;

    const confirmed = window.confirm(
      t("tasks.deleteConfirm", {
        title: currentTask.title ?? t("tasks.untitledTask"),
      }),
    );
    if (!confirmed) return;

    setDeletingTask(true);
    try {
      const { error } = await deleteTask(currentTask.id);
      if (error) {
        throw error;
      }
      toast({
        title: t("tasks.taskDeleted"),
        description: t("tasks.taskDeletedHelp"),
      });
      onClose();
    } catch (error) {
      logger.error("Error deleting task:", { error, tags: ["error"] });
      toast({
        title: t("tasks.deleteFailed"),
        description: t("tasks.deleteFailedHelp"),
        variant: "destructive",
      });
    } finally {
      setDeletingTask(false);
    }
  };

  const handleAssigneeChange = async (value: string) => {
    if (!currentTask) return;

    const nextAssignedTo = value === "none" ? null : value;
    const previousAssignedTo = currentTask.assigned_to ?? null;

    if (nextAssignedTo === previousAssignedTo) {
      setAssignmentValue(value);
      return;
    }

    setAssignmentValue(value);
    setUpdatingAssignment(true);

    try {
      const { data, error } = await updateTask(currentTask.id, {
        assigned_to: nextAssignedTo,
      });

      if (error || !data) {
        throw error ?? new Error(t("tasks.assignmentFailedHelp"));
      }

      const selectedAssignee = assignees.find(
        (option) => option.id === nextAssignedTo,
      );

      const updatedTask: TaskWithRelations = {
        ...currentTask,
        ...data,
        assignedprofile: selectedAssignee
          ? {
              first_name: selectedAssignee.first_name,
              last_name: selectedAssignee.last_name,
            }
          : null,
      };

      setCurrentTask(updatedTask);
      onTaskUpdate?.(updatedTask);

      toast({
        title: t("tasks.assignmentUpdated"),
        description: selectedAssignee
          ? t("tasks.assignedToName", {
              name: `${selectedAssignee.first_name} ${selectedAssignee.last_name}`.trim(),
            })
          : t("tasks.nowUnassigned"),
      });
    } catch (error) {
      logger.error("Error updating task assignment:", {
        error,
        tags: ["error"],
      });
      setAssignmentValue(previousAssignedTo ?? "none");
      toast({
        title: t("tasks.assignmentFailed"),
        description: t("tasks.assignmentFailedHelp"),
        variant: "destructive",
      });
    } finally {
      setUpdatingAssignment(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentTask || !newComment.trim()) return;

    const result = await submitComment(newComment);
    if (result.success) {
      setNewComment("");
      toast({
        title: t("tasks.commentAdded"),
        description: t("tasks.commentAddedHelp"),
      });
    } else {
      toast({
        title: t("tasks.errorTitle"),
        description: result.error?.message ?? t("tasks.commentFailed"),
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (targetStatus: WorkflowStatus) => {
    if (!currentTask) return;
    setPendingTarget(targetStatus);

    try {
      const { data, error } = await updateStatus(currentTask.id, targetStatus);
      if (error || !data) {
        const errorMessage =
          (error as Error)?.message ?? t("tasks.unexpectedError");
        toast({
          title: t("tasks.statusUpdateFailed"),
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const updatedTask: TaskWithRelations = {
        ...currentTask,
        ...data,
      };

      setCurrentTask(updatedTask);
      onTaskUpdate?.(updatedTask);

      let successMessage = t("tasks.statusUpdatedTo", {
        status: translatedStatusLabel(t, targetStatus),
      });

      if (targetStatus === "done" || targetStatus === "completed") {
        successMessage = t("tasks.markedCompleted");
      } else if (targetStatus === "todo") {
        successMessage = t("tasks.reopened");
      } else if (targetStatus === "cancelled") {
        successMessage = t("tasks.cancelledTask");
      }

      toast({
        title: t("tasks.statusUpdated"),
        description: successMessage,
      });
    } catch (error) {
      logger.error("Error updating task status:", { error, tags: ["error"] });
      toast({
        title: t("tasks.statusUpdateFailed"),
        description: t("tasks.unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setPendingTarget(null);
    }
  };

  const statusActions = useMemo(() => {
    if (!currentTask) return [];
    const current = normalizeTaskStatus(currentTask.status);
    if (!current) return [];
    const transitions = TASK_STATUS_TRANSITIONS[current] ?? [];
    return transitions.map((target) => ({
      target,
      label: workflowActionLabel(t, current, target),
      variant: getActionVariant(current, target),
    }));
  }, [currentTask, t]);

  if (!currentTask) return null;
  const taskIsOpen = isOpenTaskStatus(currentTask.status);

  const scheduleLink = readScheduleTaskLink(currentTask);
  const kindLabel = translatedKindLabel(t, readTaskKind(currentTask));
  const linkedFormId = readFormId(currentTask.links);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto p-4 sm:max-w-[720px] sm:p-6" data-testid="task-details-dialog">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold">
                {display.title}
              </DialogTitle>
              {display.description ? (
                <DialogDescription className="text-base leading-relaxed">
                  {display.description}
                </DialogDescription>
              ) : null}
              {display.control ? (
                <button
                  type="button"
                  className="text-left text-xs text-muted-foreground underline"
                  onClick={display.toggle}
                >
                  {display.control}
                </button>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline">{kindLabel}</Badge>
                {scheduleLink ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {scheduleLink.shiftTitle}
                    </span>
                    <Link
                      href={scheduleLink.href}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t("tasks.openShift")}
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`h-3 w-3 rounded-full ${getPriorityColor(currentTask.priority)}`}
              />
                <Badge className={getTaskStatusBadgeClass(currentTask.status)}>
                {translatedStatusLabel(t, currentTask.status ?? "")}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {linkedFormId ? (
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              data-testid="task-details-fill"
              onClick={() => onFillForm?.(linkedFormId)}
            >
              {t("tasks.fillAndSend")}
            </Button>
          ) : null}
          <div
            className="rounded-md border bg-muted/40 p-4 space-y-3"
            data-testid="task-details-actions"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {taskIsOpen ? t("tasks.statusTodo") : t("tasks.statusDone")}
              </p>
              <Badge variant="secondary">
                {translatedStatusLabel(t, currentTask.status ?? "")}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusActions.length > 0 ? (
                statusActions.map((action) => (
                  <Button
                    key={`${currentTask.id}-${action.target}`}
                    variant={action.variant}
                    size="sm"
                    className="min-h-11"
                    data-testid={
                      action.target === "completed"
                        ? "task-details-complete"
                        : action.target === "todo"
                          ? "task-details-reopen"
                          : undefined
                    }
                    onClick={() => handleStatusChange(action.target)}
                    disabled={!!pendingTarget}
                  >
                    {pendingTarget === action.target
                      ? t("tasks.updating")
                      : action.label}
                  </Button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("tasks.noAvailableTransitionsFromThisStatus")}
                </p>
              )}
            </div>
          </div>

          {canEdit ? (
            <TaskDetailsExecutionCard
              executionForm={executionForm}
              onExecutionFormChange={setExecutionForm}
              dueBy={dueBy}
              onDueByChange={setDueBy}
              shopTimeZone={shopTimeZone}
              onSave={() => {
                void handleSaveExecution();
              }}
              savingExecution={savingExecution}
              onDelete={() => {
                void handleDeleteTask();
              }}
              deletingTask={deletingTask}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("tasks.assignee")}
                </Label>
                <Select
                  value={assignmentValue}
                  onValueChange={handleAssigneeChange}
                  disabled={!canEdit || optionsLoading || updatingAssignment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.selectTeamMember")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("tasks.unassigned")}</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.first_name} {assignee.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updatingAssignment && (
                  <p className="text-xs text-muted-foreground">
                    {t("tasks.updatingAssignment")}
                  </p>
                )}
              </div>
              {currentTask.created_by === user?.id || can("editTasks") ? (
              <>
              <TaskAudienceFields
                idPrefix="edit-task"
                viewAudience={viewAudience}
                editAudience={editAudience}
                people={assignees.map((person) => ({
                  id: person.id,
                  label: `${person.first_name} ${person.last_name}`.trim(),
                }))}
                positions={positions.map((item) => ({ id: item.id, label: item.name }))}
                roles={roles.map((item) => ({ id: item.id, label: item.name }))}
                departments={departments.map((item) => ({ id: item.id, label: item.name }))}
                onViewChange={setViewAudience}
                onEditChange={setEditAudience}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAudience}
                disabled={savingAudience}
              >
                {savingAudience ? t("tasks.savingVisibility") : t("tasks.saveVisibility")}
              </Button>
              </>
              ) : null}
            </div>

            <div className="space-y-3">
              {currentTask.due_date || currentTask.due_at ? (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("tasks.due")}</span>
                  <span>
                    {formatTaskDueLabel(currentTask, t, language, shopTimeZone)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("tasks.created")}</span>
                <span>
                  {format(new Date(currentTask.created_at), "MMM dd, yyyy")}
                </span>
              </div>
              {currentTask.completed_at && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("tasks.completed")}</span>
                  <span>
                    {format(new Date(currentTask.completed_at), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
              {currentTask.department && (
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">{t("tasks.department")}</span>
                  <span>{currentTask.department.name}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <TaskTimeline taskId={currentTask.id} open={open} />

          <Separator />

          <TaskDetailsCommentsPanel
            comments={comments}
            loadingComments={loadingComments}
            commentsError={commentsError}
            addingComment={addingComment}
            newComment={newComment}
            onNewCommentChange={setNewComment}
            onAddComment={() => {
              void handleAddComment();
            }}
            onRetry={() => {
              void refreshComments();
            }}
            commentTranslations={commentTranslations}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
