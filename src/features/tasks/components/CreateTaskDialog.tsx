import { useTranslation } from "react-i18next";
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
import type { TaskPublishState } from "@/features/tasks/utils/taskSchedule";
import type { TaskCreateScope } from "@/features/roles/constants/taskCreateScope";
import { peopleWithinTaskCreateScope } from "@/features/tasks/utils/taskAssigneeScope";
import { TaskAudienceFields } from "@/features/tasks/components/TaskAudienceFields";
import {
  defaultTaskAudience,
  type TaskAudience,
} from "@/features/tasks/utils/taskAudience";
import {
  TaskDueByFields,
  type TaskDueByValue,
} from "@/features/tasks/components/TaskDueByFields";
import { useShopTimeZone } from "@/features/tasks/hooks/useShopTimeZone";
import {
  buildCreateTaskInsert,
  validateCreateTaskForm,
} from "@/features/tasks/utils/createTaskDialogSubmit";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  createLevel?: "self" | "others";
  scope?: TaskCreateScope | null;
  onCreated?: (task: { id: string; title?: string | null }) => void;
}

export function CreateTaskDialog({
  open,
  onClose,
  createLevel = "others",
  scope = null,
  onCreated,
}: CreateTaskDialogProps) {
  const { t } = useTranslation();
  const { createTask } = useTasks();
  const { user } = useAuth();
  const { toast } = useToast();
  const shopTimeZone = useShopTimeZone();
  const {
    assignees,
    positions,
    roles,
    departments,
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
    points: "",
    assigned_to: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dueBy, setDueBy] = useState<TaskDueByValue>({
    enabled: false,
    dateYmd: "",
    timeHm: "",
  });
  const [audienceTouched, setAudienceTouched] = useState(false);
  const [viewAudience, setViewAudience] = useState<TaskAudience>(defaultTaskAudience(null));
  const [editAudience, setEditAudience] = useState<TaskAudience>(defaultTaskAudience(null));
  const allowedAssignees =
    scope && user
      ? peopleWithinTaskCreateScope({
          selfId: user.id,
          scope,
          people: assignees.map((person) => ({
            id: person.id,
            level: person.level,
            name: `${person.first_name} ${person.last_name}`.trim(),
          })),
        })
      : [];
  const scopePending = createLevel === "others" && !scope;
  const onlySelf =
    createLevel === "self" ||
    (scope != null &&
      allowedAssignees.every((person) => person.id === user?.id));

  useEffect(() => {
    if (audienceTouched) return;
    const next = defaultTaskAudience(onlySelf ? user?.id ?? "self" : formData.assigned_to || null);
    setViewAudience(next);
    setEditAudience(next);
  }, [audienceTouched, onlySelf, user?.id, formData.assigned_to]);

  useEffect(() => {
    if (!optionsError) return;
    toast({
      title: t("tasks.unableToLoadOptions"),
      description: t("tasks.optionsUnavailable"),
      variant: "destructive",
    });
  }, [optionsError, t, toast]);

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
      points: "",
      assigned_to: "",
    });
    setCreateReminder(false);
    setAudienceTouched(false);
    setViewAudience(defaultTaskAudience(null));
    setEditAudience(defaultTaskAudience(null));
    setDueBy({ enabled: false, dateYmd: "", timeHm: "" });
    setErrors({});
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

    const validationErrors = validateCreateTaskForm({
      formData,
      dueBy,
      viewAudience,
      editAudience,
      onlySelf,
      scope,
      t,
    });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const { row: taskData } = buildCreateTaskInsert({
        formData,
        dueBy,
        shopTimeZone,
        userId: user.id,
        onlySelf,
        viewAudience,
        editAudience,
      });

      const { data: newTask, error } = await createTask(taskData as never);

      if (error) {
        toast({
          title: t("tasks.errorTitle"),
          description: t("tasks.createFailed"),
          variant: "destructive",
        });
      } else {
        toast({ title: t("tasks.taskCreated") });
        if (newTask) {
          onCreated?.({ id: newTask.id, title: newTask.title });
          if (createReminder) {
            setCreatedTaskId(newTask.id);
            setShowReminderDialog(true);
          }
        }
        handleDialogChange(false);
      }
    } catch (error) {
      logger.error("Error creating task:", { error, tags: ["error"] });
      toast({
        title: t("tasks.errorTitle"),
        description: t("tasks.unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-[500px] sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("tasks.createNewTask")}</DialogTitle>
          <DialogDescription>
            {t("tasks.createANewTaskToTrackYourWork")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("tasks.title")}</Label>
            <Input
              id="title"
              placeholder={t("tasks.enterTaskTitle")}
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
            <Label htmlFor="description">{t("tasks.description")}</Label>
            <Textarea
              id="description"
              placeholder={t("tasks.enterTaskDescription")}
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">{t("tasks.priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleFieldChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("tasks.selectPriority")} />
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
              <Label htmlFor="publish_state">{t("tasks.publish")}</Label>
              <Select
                value={formData.publish_state}
                onValueChange={(value) =>
                  handleFieldChange("publish_state", value)
                }
              >
                <SelectTrigger id="publish_state">
                  <SelectValue placeholder={t("tasks.publish")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">{t("tasks.publishNow")}</SelectItem>
                  <SelectItem value="scheduled">{t("tasks.scheduleForTheStart")}</SelectItem>
                  <SelectItem value="draft">{t("tasks.draft")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {onlySelf ? (
              <div className="space-y-2">
                <Label>{t("tasks.assignTo")}</Label>
                <p className="text-sm text-muted-foreground">{t("tasks.assignedToYou")}</p>
              </div>
            ) : (
            <div className="space-y-2">
              <Label htmlFor="assigned_to">{t("tasks.assignTo")}</Label>
              <Select
                value={formData.assigned_to || "none"}
                onValueChange={(value) =>
                  handleFieldChange(
                    "assigned_to",
                    value === "none" ? "" : value,
                  )
                }
                disabled={optionsLoading || scopePending}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      optionsLoading || scopePending
                        ? t("tasks.loadingTeam")
                        : t("tasks.selectTeamMember")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {scope ? null : (
                    <SelectItem value="none">{t("tasks.unassigned")}</SelectItem>
                  )}
                  {allowedAssignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
                {errors.assigned_to ? (
                  <p className="text-sm text-destructive">{errors.assigned_to}</p>
                ) : null}
              </div>
            )}

          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">{t("tasks.starts")}</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => handleFieldChange("starts_at", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">{t("tasks.ends")}</Label>
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
            {t("tasks.theWindowIsWhenTheTaskIsOpen")}
          </p>

          <TaskDueByFields
            idPrefix="create-task"
            value={dueBy}
            timeZone={shopTimeZone}
            onChange={(next) => {
              setDueBy(next);
              clearError("due_by");
            }}
            error={errors.due_by}
          />

          <TaskAudienceFields
            idPrefix="create-task"
            viewAudience={viewAudience}
            editAudience={editAudience}
            people={assignees.map((person) => ({
              id: person.id,
              label: `${person.first_name} ${person.last_name}`.trim(),
            }))}
            positions={positions.map((item) => ({ id: item.id, label: item.name }))}
            roles={roles.map((item) => ({ id: item.id, label: item.name }))}
            departments={departments.map((item) => ({ id: item.id, label: item.name }))}
            onViewChange={(audience) => {
              setAudienceTouched(true);
              setViewAudience(audience);
              clearError("audience");
            }}
            onEditChange={(audience) => {
              setAudienceTouched(true);
              setEditAudience(audience);
              clearError("audience");
            }}
          />
          {errors.audience ? (
            <p className="text-sm text-destructive">{errors.audience}</p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="points">{t("tasks.points")}</Label>
            <Input
              id="points"
              type="number"
              min={0}
              step={1}
              placeholder={t("tasks.optional")}
              value={formData.points}
              onChange={(e) => handleFieldChange("points", e.target.value)}
              aria-invalid={Boolean(errors.points)}
              aria-describedby={
                errors.points ? "create-task-points-error" : undefined
              }
            />
            <p className="text-sm text-muted-foreground">
              {t("tasks.wholePointsOnCompletionTheLeaderboardUsesThis")}
            </p>
            {errors.points && (
              <p className="text-sm text-destructive" id="create-task-points-error">
                {errors.points}
              </p>
            )}
          </div>

          {/* Reminder Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-reminder"
              checked={createReminder}
              onCheckedChange={(checked) => setCreateReminder(checked === true)}
            />
            <Label htmlFor="create-reminder" className="text-sm">
              {t("tasks.createReminderForThisTask")}
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={loading}
            >
              {t("tasks.cancel")}
            </Button>
            <Button
              type="submit"
              className="min-h-11"
              disabled={loading || scopePending || !formData.title.trim()}
            >
              {loading ? t("tasks.creating") : t("tasks.createTask")}
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
