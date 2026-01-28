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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateReminderDialog } from "@/components/reminders/CreateReminderDialog";
import { useTaskFormOptions } from "@/hooks/useTaskFormOptions";
import { logger } from "@/utils/logger";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
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
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [createReminder, setCreateReminder] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    estimated_hours: "",
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
      estimated_hours: "",
      assigned_to: "",
      goal_id: "",
    });
    setDueDate(undefined);
    setCreateReminder(false);
    setErrors({});
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      nextErrors.title = "A title is required.";
    }
    if (formData.estimated_hours) {
      const value = parseFloat(formData.estimated_hours);
      if (Number.isNaN(value) || value < 0) {
        nextErrors.estimated_hours =
          "Estimated hours must be a positive number.";
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
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: "todo" as const,
        priority: formData.priority as any,
        created_by: user.id,
        due_date: dueDate?.toISOString() || null,
        estimated_hours: formData.estimated_hours
          ? parseFloat(formData.estimated_hours)
          : null,
        assigned_to: formData.assigned_to ? formData.assigned_to : null,
        department_id: null,
        tags: null,
        attachments: [],
        parent_task_id: null,
        workflow_id: null,
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
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                placeholder="0"
                value={formData.estimated_hours}
                onChange={(e) =>
                  handleFieldChange("estimated_hours", e.target.value)
                }
                aria-invalid={Boolean(errors.estimated_hours)}
                aria-describedby={
                  errors.estimated_hours
                    ? "create-task-estimated-hours-error"
                    : undefined
                }
                min={0}
              />
              {errors.estimated_hours && (
                <p
                  className="text-sm text-destructive"
                  id="create-task-estimated-hours-error"
                >
                  {errors.estimated_hours}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  aria-label="Pick a due date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

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
