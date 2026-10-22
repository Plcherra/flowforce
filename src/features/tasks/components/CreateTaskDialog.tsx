import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateReminderDialog } from "@/features/tasks/components/reminders/CreateReminderDialog";
import { useTaskFormOptions } from "@/hooks/useTaskFormOptions";
import { logger } from "@/utils/logger";
import {
  dueDateFromWindowEnd,
  fromDatetimeLocalValue,
  mergeTaskSchedule,
  type TaskPublishState,
} from "@/features/tasks/utils/taskSchedule";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  createLevel?: "self" | "others";
}

export function CreateTaskDialog({
  open,
  onClose,
  createLevel = "others",
}: CreateTaskDialogProps) {
  const { createTask } = useTasks();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    assignees,
    goals,
    loading: optionsLoading,
    error: optionsError,
  } = useTaskFormOptions(open);
  const [loading, setLoading] = useState(false);
  const [createReminder, setCreateReminder] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    starts_at: "",
    ends_at: "",
    publish_state: "published" as TaskPublishState,
    assigned_to: "",
    goal_id: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!optionsError) return;
    toast({
      title: "Unable to load options",
      description:
        "Some fields may be unavailable right now. Please try again later.",
      variant: "destructive",
    });
  }, [optionsError, toast]);

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      starts_at: "",
      ends_at: "",
      publish_state: "published",
      assigned_to: "",
      goal_id: "",
    });
    setCreateReminder(false);
    setErrors({});
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      nextErrors.title = "A title is required.";
    }
    if (formData.starts_at || formData.ends_at) {
      const startsAt = fromDatetimeLocalValue(formData.starts_at);
      const endsAt = fromDatetimeLocalValue(formData.ends_at);
      if (!startsAt || !endsAt) {
        nextErrors.ends_at = "A window needs a start and an end.";
      } else if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
        nextErrors.ends_at = "The end must be after the start.";
      }
    }
    return nextErrors;
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const startsAt = fromDatetimeLocalValue(formData.starts_at);
      const endsAt = fromDatetimeLocalValue(formData.ends_at);
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: "todo" as const,
        priority: formData.priority as any,
        created_by: user.id,
        due_date: dueDateFromWindowEnd(endsAt),
        links: mergeTaskSchedule(null, {
          startsAt,
          endsAt,
          publishState: formData.publish_state,
        }),
        assigned_to:
          createLevel === "self"
            ? user.id
            : formData.assigned_to
              ? formData.assigned_to
              : null,
        departmentid: null,
        tags: null,
        attachments: [],
        parent_task_id: null,
        workflowid: null,
        actual_hours: null,
        goal_id: formData.goal_id ? formData.goal_id : null,
      };

      const { data: newTask, error } = await createTask(taskData);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create task. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Task created successfully.",
        });

        // If user wants to create reminder, show reminder dialog
        if (createReminder && newTask) {
          setCreatedTaskId(newTask.id);
          setShowReminderDialog(true);
        }

        handleDialogChange(false);
      }
    } catch (error) {
      logger.error("Error creating task:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task to track your work and collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? "create-task-title-error" : undefined
              }
              required
            />
            {errors.title && (
              <p
                className="text-sm text-destructive"
                id="create-task-title-error"
              >
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter task description"
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleFieldChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
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
              <Label htmlFor="publish_state">Publish</Label>
              <Select
                value={formData.publish_state}
                onValueChange={(value) =>
                  handleFieldChange("publish_state", value)
                }
              >
                <SelectTrigger id="publish_state">
                  <SelectValue placeholder="Publish" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Publish now</SelectItem>
                  <SelectItem value="scheduled">Schedule for the start</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {createLevel === "self" ? (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <p className="text-sm text-muted-foreground">Assigned to you</p>
              </div>
            ) : (
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to || "none"}
                onValueChange={(value) =>
                  handleFieldChange(
                    "assigned_to",
                    value === "none" ? "" : value,
                  )
                }
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      optionsLoading
                        ? "Loading team members…"
                        : "Select team member"
                    }
                  />
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
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="goal_id">Linked Goal</Label>
              <Select
                value={formData.goal_id || "none"}
                onValueChange={(value) =>
                  handleFieldChange("goal_id", value === "none" ? "" : value)
                }
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      optionsLoading
                        ? "Loading goals…"
                        : goals.length === 0
                          ? "No goals available"
                          : "Select goal (optional)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No goal</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => handleFieldChange("starts_at", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => handleFieldChange("ends_at", e.target.value)}
                aria-invalid={Boolean(errors.ends_at)}
                aria-describedby={
                  errors.ends_at ? "create-task-window-error" : undefined
                }
              />
              {errors.ends_at && (
                <p
                  className="text-sm text-destructive"
                  id="create-task-window-error"
                >
                  {errors.ends_at}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            The window is when the task is open. It is not how long the work takes.
          </p>

          {/* Reminder Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-reminder"
              checked={createReminder}
              onCheckedChange={(checked) => setCreateReminder(checked === true)}
            />
            <Label htmlFor="create-reminder" className="text-sm">
              Create reminder for this task
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Reminder Dialog */}
      {showReminderDialog && createdTaskId && (
        <CreateReminderDialog
          open={showReminderDialog}
          onOpenChange={setShowReminderDialog}
          taskId={createdTaskId}
        />
      )}
    </Dialog>
  );
}
