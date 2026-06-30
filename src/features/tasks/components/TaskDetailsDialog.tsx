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
  Target,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import {
  useTasks,
  TASK_STATUS_TRANSITIONS,
  labelFor,
  normalizeTaskStatus,
  type TaskStatus as WorkflowStatus,
  type TaskWithRelations,
} from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";
import { TaskTimeline } from "./TaskTimeline";
import {
  getTaskStatusBadgeClass,
  getTaskStatusLabel,
  TASK_STATUS_FLOW,
} from "@/constants/taskStatus";
import { useTaskFormOptions } from "@/hooks/useTaskFormOptions";
import { useTaskComments } from "@/features/tasks/hooks";
import { CommentsSkeleton } from "@/components/loading/TaskSkeletons";
import { logger } from "@/utils/logger";

type ButtonVariant = "default" | "secondary" | "outline";
interface TaskDetailsDialogProps {
  task: TaskWithRelations | null;
  open: boolean;
  onClose: () => void;
  onTaskUpdate?: (task: TaskWithRelations) => void;
}

const getPriorityColor = (priority?: string | null) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const getActionLabel = (current: WorkflowStatus, target: WorkflowStatus) => {
  if (current === "todo" && target === "in_progress") return "Start Task";
  if (current === "in_progress" && target === "review") return "Send to Review";
  if (current === "in_progress" && target === "blocked") return "Mark Blocked";
  if (current === "blocked" && target === "in_progress") return "Unblock Task";
  if (target === "cancelled") return "Cancel Task";
  if (target === "done") return "Mark Done";
  if (target === "todo") {
    if (current === "cancelled") return "Reopen Task";
    if (current === "review") return "Send Back to To Do";
    return "Move to To Do";
  }
  return `Move to ${labelFor(target)}`;
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
}: TaskDetailsDialogProps) {
  const { updateStatus, updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const {
    assignees,
    goals,
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
  const [goalValue, setGoalValue] = useState("none");
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [updatingGoal, setUpdatingGoal] = useState(false);
  const [executionForm, setExecutionForm] = useState({
    priority: "medium",
    due_date: "",
    estimated_hours: "",
    actual_hours: "",
  });
  const [savingExecution, setSavingExecution] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const { comments, loadingComments, addingComment, submitComment } =
    useTaskComments(currentTask, open);

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  useEffect(() => {
    const task = currentTask;
    if (!task) {
      setAssignmentValue("none");
      setGoalValue("none");
      return;
    }

    setAssignmentValue(task.assigned_to ?? "none");
    setGoalValue(task.goal_id ?? "none");
    setExecutionForm({
      priority: task.priority ?? "medium",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
      estimated_hours:
        task.estimated_hours != null
          ? String(task.estimated_hours)
          : "",
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

    setSavingExecution(true);
    try {
      const { data, error } = await updateTask(currentTask.id, {
        priority: executionForm.priority,
        due_date: executionForm.due_date
          ? new Date(`${executionForm.due_date}T12:00:00`).toISOString()
          : null,
        estimated_hours: parseHoursInput(executionForm.estimated_hours),
        actual_hours: parseHoursInput(executionForm.actual_hours),
      });

      if (error || !data) {
        throw error ?? new Error("Unable to save task execution details");
      }

      const updatedTask: TaskWithRelations = {
        ...currentTask,
        ...data,
      };

      setCurrentTask(updatedTask);
      onTaskUpdate?.(updatedTask);
      toast({
        title: "Execution details saved",
        description: "Priority, due date, and hour tracking were updated.",
      });
    } catch (error) {
      logger.error("Error saving task execution details:", {
        error,
        tags: ["error"],
      });
      toast({
        title: "Execution update failed",
        description: "Could not save the task details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingExecution(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask) return;

    const confirmed = window.confirm(
      `Delete task "${currentTask.title ?? "Untitled task"}"?`,
    );
    if (!confirmed) return;

    setDeletingTask(true);
    try {
      const { error } = await deleteTask(currentTask.id);
      if (error) {
        throw error;
      }
      toast({
        title: "Task deleted",
        description: "The task has been removed.",
      });
      onClose();
    } catch (error) {
      logger.error("Error deleting task:", { error, tags: ["error"] });
      toast({
        title: "Delete failed",
        description: "Could not delete this task. Please try again.",
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
        throw error ?? new Error("Unable to update assignee");
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
        title: "Assignment updated",
        description: selectedAssignee
          ? `Task assigned to ${selectedAssignee.first_name} ${selectedAssignee.last_name}.`
          : "Task is now unassigned.",
      });
    } catch (error) {
      logger.error("Error updating task assignment:", {
        error,
        tags: ["error"],
      });
      setAssignmentValue(previousAssignedTo ?? "none");
      toast({
        title: "Assignment update failed",
        description: "Could not update the task assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingAssignment(false);
    }
  };

  const handleGoalChange = async (value: string) => {
    if (!currentTask) return;

    const nextGoalId = value === "none" ? null : value;
    const previousGoalId = currentTask.goal_id ?? null;

    if (nextGoalId === previousGoalId) {
      setGoalValue(value);
      return;
    }

    setGoalValue(value);
    setUpdatingGoal(true);

    try {
      const { data, error } = await updateTask(currentTask.id, {
        goal_id: nextGoalId,
      });

      if (error || !data) {
        throw error ?? new Error("Unable to update goal");
      }

      const selectedGoal = goals.find(
        (goalOption) => goalOption.id === nextGoalId,
      );

      const updatedTask: TaskWithRelations = {
        ...currentTask,
        ...data,
        goal:
          nextGoalId && selectedGoal
            ? {
                id: selectedGoal.id,
                title: selectedGoal.title,
                status: selectedGoal.status,
                progress: selectedGoal.progress,
                target_completion_date: selectedGoal.target_completion_date,
              }
            : null,
      };

      setCurrentTask(updatedTask);
      onTaskUpdate?.(updatedTask);

      toast({
        title: "Goal link updated",
        description: selectedGoal
          ? `Task linked to goal “${selectedGoal.title}”.`
          : "Task is no longer linked to a goal.",
      });
    } catch (error) {
      logger.error("Error updating task goal link:", {
        error,
        tags: ["error"],
      });
      setGoalValue(previousGoalId ?? "none");
      toast({
        title: "Goal update failed",
        description: "Could not update the goal link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingGoal(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentTask || !newComment.trim()) return;

    const result = await submitComment(newComment);
    if (result.success) {
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment was posted successfully.",
      });
    } else {
      toast({
        title: "Error",
        description:
          result.error?.message ?? "Failed to add comment. Please try again.",
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
          (error as Error)?.message ??
          "Unable to update task status. Please try again.";
        toast({
          title: "Status update failed",
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
      let successMessage = `Task status updated to ${labelFor(targetStatus)}.`;

      if (targetStatus === "in_progress") {
        successMessage = "Task is now in progress.";
      } else if (targetStatus === "done" || targetStatus === "completed") {
        successMessage = "Task marked as completed.";
      } else if (targetStatus === "blocked") {
        successMessage = "Task marked as blocked.";
      } else if (targetStatus === "todo") {
        successMessage =
          previous === "cancelled"
            ? "Task reopened and moved back to To Do."
            : "Task moved back to To Do.";
      } else if (targetStatus === "review") {
        successMessage = "Task moved to review.";
      } else if (targetStatus === "cancelled") {
        successMessage = "Task cancelled.";
      }

      toast({
        title: "Status updated",
        description: successMessage,
      });
    } catch (error) {
      logger.error("Error updating task status:", { error, tags: ["error"] });
      toast({
        title: "Status update failed",
        description: "An unexpected error occurred. Please try again.",
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
      label: getActionLabel(current, target),
      variant: getActionVariant(current, target),
    }));
  }, [currentTask]);

  const activeFlowIndex = (() => {
    if (!currentTask) return -1;
    const normalized = normalizeTaskStatus(currentTask.status);
    if (!normalized) return -1;
    return TASK_STATUS_FLOW.indexOf(
      normalized as (typeof TASK_STATUS_FLOW)[number],
    );
  })();

  if (!currentTask) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold">
                {currentTask.title}
              </DialogTitle>
              {currentTask.description && (
                <DialogDescription className="text-base leading-relaxed">
                  {currentTask.description}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`h-3 w-3 rounded-full ${getPriorityColor(currentTask.priority)}`}
              />
              <Badge className={getTaskStatusBadgeClass(currentTask.status)}>
                {getTaskStatusLabel(currentTask.status)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-md border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Workflow
              </p>
              <Badge variant="secondary">
                {getTaskStatusLabel(currentTask.status)}
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
                              ? "bg-emerald-500"
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
                        {getTaskStatusLabel(status)}
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
                  {getTaskStatusLabel(currentTask.status)} (outside primary
                  flow)
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
                    onClick={() => handleStatusChange(action.target)}
                    disabled={!!pendingTarget}
                  >
                    {pendingTarget === action.target
                      ? "Updating…"
                      : action.label}
                  </Button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No available transitions from this status.
                </p>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Execution Controls</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleDeleteTask}
                  disabled={deletingTask}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingTask ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Priority
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
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="task-due-date"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Due date
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={executionForm.due_date}
                  onChange={(event) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      due_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="task-estimated-hours"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Estimated hours
                </Label>
                <Input
                  id="task-estimated-hours"
                  type="number"
                  min={0}
                  step="0.25"
                  value={executionForm.estimated_hours}
                  onChange={(event) =>
                    setExecutionForm((prev) => ({
                      ...prev,
                      estimated_hours: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="task-actual-hours"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Actual hours
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

              <div className="md:col-span-4 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSaveExecution}
                  disabled={savingExecution}
                >
                  {savingExecution ? "Saving..." : "Save execution details"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Assignee
                </Label>
                <Select
                  value={assignmentValue}
                  onValueChange={handleAssigneeChange}
                  disabled={optionsLoading || updatingAssignment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.first_name} {assignee.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updatingAssignment && (
                  <p className="text-xs text-muted-foreground">
                    Updating assignment…
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Linked Goal
                </Label>
                <Select
                  value={goalValue}
                  onValueChange={handleGoalChange}
                  disabled={optionsLoading || updatingGoal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {goals.map((goalOption) => (
                      <SelectItem key={goalOption.id} value={goalOption.id}>
                        {goalOption.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updatingGoal && (
                  <p className="text-xs text-muted-foreground">
                    Updating goal link…
                  </p>
                )}
                {goalValue !== "none" && currentTask.goal && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {currentTask.goal.title}
                    </span>
                    <span>{currentTask.goal.progress}%</span>
                  </div>
                )}
                {goalValue === "none" && (
                  <p className="text-xs text-muted-foreground">
                    Not linked to a goal.
                  </p>
                )}
              </div>

            </div>

            <div className="space-y-3">
              {currentTask.due_date && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due:</span>
                  <span>
                    {format(new Date(currentTask.due_date), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>
                  {format(new Date(currentTask.created_at), "MMM dd, yyyy")}
                </span>
              </div>
              {currentTask.completed_at && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Completed:</span>
                  <span>
                    {format(new Date(currentTask.completed_at), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
              {currentTask.department && (
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Department:</span>
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
              <h3 className="text-lg font-semibold">Comments</h3>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
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
                  {addingComment ? "Adding…" : "Add Comment"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {loadingComments ? (
                <CommentsSkeleton />
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No comments yet. Be the first to add one.
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
                      <p className="text-sm">{comment.comment}</p>
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
