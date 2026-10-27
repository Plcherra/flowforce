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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
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
import { TaskTimeline } from "./TaskTimeline";
import {
  getTaskStatusBadgeClass,
  TASK_STATUS_FLOW,
} from "@/constants/taskStatus";
import { useCan } from "@/hooks/useCan";
import { readFormId } from "@/features/tasks/utils/shiftTaskWrite";
import {
  translatedKindLabel,
  translatedStatusLabel,
  workflowActionLabel,
} from "@/features/tasks/utils/taskCopy";
import { useTaskFormOptions } from "@/hooks/useTaskFormOptions";
import { useTaskComments } from "@/features/tasks/hooks";
import {
  dueDateFromWindowEnd,
  fromDatetimeLocalValue,
  mergeTaskSchedule,
  readTaskSchedule,
  toDatetimeLocalValue,
  type TaskPublishState,
} from "@/features/tasks/utils/taskSchedule";
import { CommentsSkeleton } from "@/components/loading/TaskSkeletons";
import { logger } from "@/utils/logger";
import { readScheduleTaskLink } from "@/features/tasks/utils/scheduleTaskLink";
import { readTaskKind } from "@/features/tasks/utils/taskKind";
import { useFormContentDisplay } from "@/features/forms/components/FormContentText";
import { TaskCommentBody } from "@/features/tasks/components/TaskCommentBody";
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
  current: WorkflowStatus,
  target: WorkflowStatus,
): ButtonVariant => {
  if (target === "todo") {
    return current === "cancelled" ? "outline" : "secondary";
  }
  if (target === "cancelled") {
    return "outline";
  }
  if (target === "blocked") {
    return "secondary";
  }
  return "default";
};

export function TaskDetailsDialog({
  task,
  open,
  onClose,
  onTaskUpdate,
  translation = null,
  onFillForm,
}: TaskDetailsDialogProps) {
  const { t } = useTranslation();
  const { can } = useCan();
  const canEdit = can("editTasks");
  const { updateStatus, updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const {
    assignees,
    loading: optionsLoading,
  } = useTaskFormOptions(open);

  const [currentTask, setCurrentTask] = useState<TaskWithRelations | null>(
    task,
  );
  const [newComment, setNewComment] = useState("");
  const [pendingTarget, setPendingTarget] = useState<WorkflowStatus | null>(
    null,
  );
  const [assignmentValue, setAssignmentValue] = useState("none");
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [executionForm, setExecutionForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    starts_at: "",
    ends_at: "",
    publish_state: "published" as TaskPublishState,
    actual_hours: "",
  });
  const [savingExecution, setSavingExecution] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const { comments, loadingComments, addingComment, submitComment } =
    useTaskComments(currentTask, open);
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
    const schedule = readTaskSchedule(task.links);
    setExecutionForm({
      title: task.title ?? "",
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      starts_at: toDatetimeLocalValue(schedule.startsAt),
      ends_at: toDatetimeLocalValue(schedule.endsAt),
      publish_state: schedule.publishState,
      actual_hours: task.actual_hours != null ? String(task.actual_hours) : "",
    });
  }, [currentTask]);

  const parseHoursInput = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

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

    setSavingExecution(true);
    try {
      const { data, error } = await updateTask(currentTask.id, {
        ...executionContentPatch(currentTask, {
          title: executionForm.title,
          description: executionForm.description,
        }),
        priority: executionForm.priority,
        due_date: dueDateFromWindowEnd(endsAt),
        actual_hours: parseHoursInput(executionForm.actual_hours),
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

      const previous = normalizeTaskStatus(currentTask.status);
      let successMessage = t("tasks.statusUpdatedTo", {
        status: translatedStatusLabel(t, targetStatus),
      });

      if (targetStatus === "in_progress") {
        successMessage = t("tasks.nowInProgress");
      } else if (targetStatus === "done" || targetStatus === "completed") {
        successMessage = t("tasks.markedCompleted");
      } else if (targetStatus === "blocked") {
        successMessage = t("tasks.markedBlocked");
      } else if (targetStatus === "todo") {
        successMessage =
          previous === "cancelled" || previous === "completed" || previous === "done"
            ? t("tasks.reopened")
            : t("tasks.backToTodo");
      } else if (targetStatus === "review") {
        successMessage = t("tasks.movedToReview");
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

  const activeFlowIndex = (() => {
    if (!currentTask) return -1;
    const normalized = normalizeTaskStatus(currentTask.status);
    if (!normalized) return -1;
    return TASK_STATUS_FLOW.indexOf(
      normalized as (typeof TASK_STATUS_FLOW)[number],
    );
  })();

  if (!currentTask) return null;

  const scheduleLink = readScheduleTaskLink(currentTask);
  const kindLabel = translatedKindLabel(t, readTaskKind(currentTask));
  const linkedFormId = readFormId(currentTask.links);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto p-4 sm:max-w-[720px] sm:p-6">
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
          <div className="rounded-md border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("tasks.workflow")}
              </p>
              <Badge variant="secondary">
                {translatedStatusLabel(t, currentTask.status ?? "")}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {TASK_STATUS_FLOW.map((status, index) => {
                const isActive = activeFlowIndex === index;
                const isCompleted = activeFlowIndex > index;
                return (
                  <React.Fragment key={status}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          isActive
                            ? "bg-primary"
                            : isCompleted
                              ? "bg-success"
                              : "bg-muted-foreground/40"
                        }`}
                      />
                      <span
                        className={`${
                          isActive
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {translatedStatusLabel(t, status)}
                      </span>
                    </div>
                    {index < TASK_STATUS_FLOW.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </React.Fragment>
                );
              })}
              {activeFlowIndex === -1 && (
                <span className="text-sm text-muted-foreground">
                  {t("tasks.outsideFlow", {
                    status: translatedStatusLabel(t, currentTask.status ?? ""),
                  })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusActions.length > 0 ? (
                statusActions.map((action) => (
                  <Button
                    key={`${currentTask.id}-${action.target}`}
                    variant={action.variant}
                    size="sm"
                    className="min-h-11"
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">{t("tasks.executionControls")}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 gap-2 text-destructive hover:text-destructive"
                  onClick={handleDeleteTask}
                  disabled={deletingTask}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingTask ? t("tasks.deleting") : t("tasks.delete")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="task-title">{t("tasks.taskTitle")}</Label>
                <Input
                  id="task-title"
                  value={executionForm.title}
                  onChange={(event) =>
                    setExecutionForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="task-description">{t("tasks.description")}</Label>
                <Textarea
                  id="task-description"
                  rows={3}
                  value={executionForm.description}
                  onChange={(event) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("tasks.priority")}
                </Label>
                <Select
                  value={executionForm.priority}
                  onValueChange={(value) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      priority: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.priority")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("tasks.low")}</SelectItem>
                    <SelectItem value="medium">{t("tasks.medium")}</SelectItem>
                    <SelectItem value="high">{t("tasks.high")}</SelectItem>
                    <SelectItem value="urgent">{t("tasks.urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="task-starts-at"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  {t("tasks.starts")}
                </Label>
                <Input
                  id="task-starts-at"
                  type="datetime-local"
                  value={executionForm.starts_at}
                  onChange={(event) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      starts_at: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="task-ends-at"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  {t("tasks.ends")}
                </Label>
                <Input
                  id="task-ends-at"
                  type="datetime-local"
                  value={executionForm.ends_at}
                  onChange={(event) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      ends_at: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("tasks.publish")}
                </Label>
                <Select
                  value={executionForm.publish_state}
                  onValueChange={(value) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      publish_state: value as TaskPublishState,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.publish")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">{t("tasks.publishNow")}</SelectItem>
                    <SelectItem value="scheduled">{t("tasks.scheduleForTheStart")}</SelectItem>
                    <SelectItem value="draft">{t("tasks.draft")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="task-actual-hours"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  {t("tasks.actualHours")}
                </Label>
                <Input
                  id="task-actual-hours"
                  type="number"
                  min={0}
                  step="0.25"
                  value={executionForm.actual_hours}
                  onChange={(event) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      actual_hours: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-stretch sm:col-span-2 sm:justify-end lg:col-span-4">
                <Button
                  type="button"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={handleSaveExecution}
                  disabled={savingExecution}
                >
                  {savingExecution ? t("tasks.saving") : t("tasks.saveExecutionDetails")}
                </Button>
              </div>
            </CardContent>
          </Card>
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

            </div>

            <div className="space-y-3">
              {currentTask.due_date && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("tasks.due")}</span>
                  <span>
                    {format(new Date(currentTask.due_date), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
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

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <h3 className="text-lg font-semibold">{t("tasks.comments")}</h3>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder={t("tasks.addAComment")}
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {addingComment ? t("tasks.adding") : t("tasks.addComment")}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {loadingComments ? (
                <CommentsSkeleton />
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t("tasks.noCommentsYetBeTheFirstToAdd")}
                </div>
              ) : (
                comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {comment.user?.first_name} {comment.user?.last_name}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {format(
                            new Date(comment.created_at),
                            "MMM dd, yyyy HH:mm",
                          )}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <TaskCommentBody
                        comment={comment.comment}
                        translation={commentTranslations.get(comment.id) ?? null}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
