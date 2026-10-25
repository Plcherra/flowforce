import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeSelector } from "./EmployeeSelector";
import { ShiftLinkedForms } from "./shift-wizard/ShiftLinkedForms";
import { ShiftTasksPanel } from "./shift-wizard/ShiftTasksPanel";
import type { ShiftTask } from "./shift-wizard/types";
import {
  X,
  Save,
  Eye,
  Trash2,
  Calendar as CalendarIcon,
  ShieldAlert,
} from "lucide-react";
import { useScheduling } from "@/contexts/SchedulingContext";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { RequestShiftSwapButton } from "@/features/scheduling/components/RequestShiftSwapButton";
import { useShiftTemplates } from "@/features/scheduling/hooks/useShiftTemplates";
import { DayEventNotice } from "@/features/scheduling/components/DayEventNotice";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/public-types";
import {
  deleteTaskRow,
  insertTask,
} from "@/features/tasks/repositories/tasksRepository";
import { refreshTasksForShift } from "@/features/tasks/repositories/scheduleTaskSync";
import type {
  CopilotDraftWarning,
  CopilotScheduleMetadata,
} from "@/features/scheduling/services/autoScheduler";
import { logger } from "@/utils/logger";
import { buildShiftConflictWarnings } from "@/features/scheduling/utils/scheduleReadiness";


const parseHourlyRate = (value: string) => {
  if (value.trim().length === 0) return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
};

const shiftTaskPriorities = ["low", "medium", "high"] as const;


type StoredShiftTask = {
  title?: string;
  description?: string;
  priority?: string;
  estimated_minutes?: number;
};

const toShiftTask = (row: {
  id: string;
  title: string | null;
  description: string | null;
  priority: string | null;
  estimated_hours: number | null;
}): ShiftTask => {
  const priority = shiftTaskPriorities.includes(
    row.priority as (typeof shiftTaskPriorities)[number],
  )
    ? (row.priority as ShiftTask["priority"])
    : "medium";
  return {
    id: row.id,
    title: row.title ?? "Untitled task",
    description: row.description ?? "",
    priority,
    estimated_minutes: Math.max(0, Math.round((row.estimated_hours ?? 0) * 60)),
  };
};

const readTemplateTasks = (value: Json | null): StoredShiftTask[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is StoredShiftTask =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
};

interface ShiftDetailsPanelProps {
  shiftId: string;
  onClose: () => void;
}

export function ShiftDetailsPanel({
  shiftId,
  onClose,
}: ShiftDetailsPanelProps) {
  const { t } = useTranslation();
  const {
    shifts,
    timeOff,
    unavailability,
    staffAvailability,
    mutations: { updateSchedule, deleteSchedule },
  } = useScheduling();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { templates, createTemplate } = useShiftTemplates();
  const [loading, setLoading] = useState(false);
  const [savedTasks, setSavedTasks] = useState<ShiftTask[]>([]);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskDraftReset, setTaskDraftReset] = useState(0);
  const taskDraftRef = useRef<Pick<
    ShiftTask,
    "title" | "description" | "priority" | "estimated_minutes"
  > | null>(null);
  const addTaskRef = useRef<(task: ShiftTask) => Promise<void>>(async () => {});
  const handleTaskDraftChange = useCallback(
    (
      draft: Pick<
        ShiftTask,
        "title" | "description" | "priority" | "estimated_minutes"
      > | null,
    ) => {
      taskDraftRef.current = draft;
    },
    [],
  );
  const [templateSaving, setTemplateSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  const shift = shifts.find((s) => s.id === shiftId);
  const currentUserIsAssigned = Boolean(
    user?.id &&
      shift?.assignments?.some((assignment) => assignment.user_id === user.id),
  );
  const copilotRequirements = shift?.requirements as
    | { copilot?: CopilotScheduleMetadata }
    | null
    | undefined;
  const copilotMeta = copilotRequirements?.copilot;
  const copilotWarnings: CopilotDraftWarning[] = copilotMeta?.warnings ?? [];

  const [formData, setFormData] = useState({
    title: "",
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
    is_all_day: false,
    timezone: "UTC",
    color: "#3b82f6",
    hourly_rate: "",
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        title: shift.title || "",
        start_time: format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm"),
        location: shift.location || "",
        notes: shift.notes || "",
        is_all_day: shift.is_all_day || false,
        timezone: shift.timezone || "UTC",
        color: shift.color || "#3b82f6",
        hourly_rate:
          typeof shift.hourly_rate === "number" ? String(shift.hourly_rate) : "",
      });
    }
  }, [shift]);


  const handleSave = async () => {
    if (!shift) return;

    setLoading(true);
    try {
      const nextStart = new Date(formData.start_time);
      const saved = await updateSchedule(shift.id, {
        ...formData,
        hourly_rate: parseHourlyRate(formData.hourly_rate),
        start_time: nextStart.toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      });
      if (saved) {
        try {
          await refreshTasksForShift(shift.id);
        } catch (error) {
          logger.error("Failed to refresh tasks for shift", {
            error,
            tags: ["error"],
          });
          toast({
            title: "Tasks not updated",
            description:
              "The shift moved, but its tasks still have the old day.",
          });
        }
      }

      const draft = taskDraftRef.current;
      if (draft?.title.trim()) {
        await addTaskRef.current({
          id: `draft-${Date.now()}`,
          ...draft,
        });
      }

    } catch (error) {
      logger.error("Error saving shift:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!shift) return;

    setLoading(true);
    try {
      await updateSchedule(shift.id, { is_published: true });
    } catch (error) {
      logger.error("Error publishing shift:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const shiftTasksQuery = useQuery({
    queryKey: ["shift-tasks", companyId, shiftId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) return [] as ShiftTask[];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, priority, estimated_hours")
        .eq("company_id", companyId)
        .eq("source", "schedule")
        .filter("links->>schedule_id", "eq", shiftId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toShiftTask);
    },
  });
  const shiftTasks = useMemo(() => {
    const fromQuery = shiftTasksQuery.data ?? [];
    const seen = new Set(fromQuery.map((task) => task.id));
    return [
      ...fromQuery,
      ...savedTasks.filter((task) => !seen.has(task.id)),
    ];
  }, [savedTasks, shiftTasksQuery.data]);


  const handleAddTask = async (task: ShiftTask) => {
    if (!companyId || !user?.id || !shift) {
      toast({
        title: "Task not saved",
        description: "Company context is required to add a task.",
        variant: "destructive",
      });
      throw new Error("Company context is required to add a task.");
    }
    const title = task.title.trim();
    try {
      const created = await insertTask({
        title,
        description: task.description.trim() || null,
        priority: task.priority,
        estimated_hours: task.estimated_minutes / 60,
        company_id: companyId,
        created_by: user.id,
        assigned_to: shift.assignments?.[0]?.user_id ?? null,
        due_date: new Date(shift.end_time).toISOString().slice(0, 10),
        status: "todo",
        source: "schedule",
        tags: ["schedule", shift.id],
        links: {
          schedule_id: shift.id,
          shift_title: shift.title || "Untitled shift",
        },
      });
      setSavedTasks((current) => [
        ...current.filter((item) => item.id !== created.id),
        toShiftTask(created),
      ]);
      setTaskError(null);
      taskDraftRef.current = null;
      setTaskDraftReset((value) => value + 1);
      await queryClient.invalidateQueries({
        queryKey: ["shift-tasks", companyId, shift.id],
      });
      toast({ title: "Task added", description: title });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save shift task";
      setTaskError(message);
      logger.error("Failed to save shift task", { error, tags: ["error"] });
      toast({
        title: "Task not saved",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };
  addTaskRef.current = handleAddTask;

  const handleRemoveTask = async (taskId: string) => {
    if (!companyId) return;
    try {
      await deleteTaskRow(taskId, companyId);
      setSavedTasks((current) => current.filter((task) => task.id !== taskId));
      await queryClient.invalidateQueries({
        queryKey: ["shift-tasks", companyId, shiftId],
      });
      toast({ title: "Task removed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove task";
      logger.error("Failed to remove shift task", { error, tags: ["error"] });
      toast({
        title: "Task not removed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!shift || !companyId || templateSaving) return;
    setTemplateSaving(true);
    try {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      const durationMs = end.getTime() - start.getTime();
      const durationHours =
        Number.isFinite(durationMs) && durationMs > 0
          ? Math.round((durationMs / 3_600_000) * 100) / 100
          : null;
      const result = await createTemplate({
        name: formData.title.trim() || "Shift template",
        description: formData.location.trim() || null,
        default_notes: formData.notes.trim() || null,
        color: formData.color || null,
        duration_hours: durationHours,
        is_all_day: formData.is_all_day,
        job_position_id: shift.position_id ?? null,
        required_headcount: null,
        tasks: shiftTasks.map((task) => ({
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimated_minutes: task.estimated_minutes,
        })) as Json,
        company_id: companyId,
        created_by: user?.id ?? null,
      });
      if (result.error || !result.data) {
        const message =
          result.error instanceof Error
            ? result.error.message
            : "Could not save this shift as a template.";
        throw new Error(message);
      }
      setSelectedTemplateId(result.data.id);
      toast({
        title: "Template saved",
        description: result.data.name || "Shift template",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save this shift as a template.";
      logger.error("Failed to save shift template", { error, tags: ["error"] });
      toast({
        title: "Template not saved",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleLoadTemplate = async () => {
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template || !shift) return;
    const start = new Date(formData.start_time);
    let endTime = formData.end_time;
    if (
      !template.is_all_day &&
      template.duration_hours &&
      !Number.isNaN(start.getTime())
    ) {
      const end = new Date(start.getTime() + template.duration_hours * 3_600_000);
      endTime = format(end, "yyyy-MM-dd'T'HH:mm");
    }
    setFormData((current) => ({
      ...current,
      title: template.name || current.title,
      notes: template.default_notes || current.notes,
      location: template.description || current.location,
      color: template.color || current.color,
      is_all_day: template.is_all_day ?? current.is_all_day,
      end_time: endTime,
    }));

    const templateTasks = readTemplateTasks(template.tasks);
    const existingTitles = new Set(
      shiftTasks.map((task) => task.title.trim().toLowerCase()),
    );
    const missingTasks = templateTasks.filter((task) => {
      const title = task.title?.trim();
      return Boolean(title) && !existingTitles.has(title!.toLowerCase());
    });
    for (const task of missingTasks) {
      const priority = shiftTaskPriorities.includes(
        task.priority as (typeof shiftTaskPriorities)[number],
      )
        ? (task.priority as ShiftTask["priority"])
        : "medium";
      try {
        await handleAddTask({
          id: `${template.id}-${task.title}`,
          title: task.title?.trim() || "Template task",
          description: task.description ?? "",
          priority,
          estimated_minutes: task.estimated_minutes ?? 30,
        });
      } catch {
        break;
      }
    }

    setActiveTab("details");
    toast({
      title: "Template loaded",
      description: "Save changes to keep these shift details.",
    });
  };

  const handleDelete = async () => {
    if (!shift || !confirm("Are you sure you want to delete this shift?"))
      return;

    setLoading(true);
    try {
      await deleteSchedule(shift.id);
      onClose();
    } catch (error) {
      logger.error("Error deleting shift:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const conflictWarnings = useMemo(
    () =>
      shift
        ? buildShiftConflictWarnings({
            shift,
            shifts,
            timeOff,
            unavailability,
            staffAvailability,
          })
        : [],
    [shift, shifts, timeOff, unavailability, staffAvailability],
  );


  if (!shift) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("schedule.shiftDetails")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("schedule.shiftNotFound")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="shift-details-panel"
    >
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t("schedule.shiftDetails")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t("schedule.closeShiftDetails")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t("schedule.details")}</TabsTrigger>
            <TabsTrigger value="tasks">{t("schedule.tasks")}</TabsTrigger>
            <TabsTrigger value="templates">{t("schedule.templates")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {currentUserIsAssigned && user?.id ? (
              <RequestShiftSwapButton
                scheduleId={shiftId}
                requestingUserId={user.id}
              />
            ) : null}
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <DayEventNotice className="text-xs" />
              </div>
              {conflictWarnings.length > 0 && (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-destructive">
                      {t("schedule.conflictWarnings")}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-destructive/40 bg-destructive/10 text-destructive"
                    >
                      {conflictWarnings.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {conflictWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className="rounded-md border border-destructive/40 bg-background p-2 text-sm text-muted-foreground"
                      >
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {copilotMeta && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t("schedule.aiCopilotDraft")}</p>
                      <p className="text-xs text-muted-foreground">
                        Run {copilotMeta.runId?.slice?.(0, 8) ?? "—"} •{" "}
                        {copilotMeta.status ?? "draft-only"}
                      </p>
                    </div>
                    <Badge variant="outline">{t("schedule.draft")}</Badge>
                  </div>
                  {copilotWarnings.length > 0 ? (
                    <div className="space-y-2">
                      {copilotWarnings.map((warning, index) => (
                        <div
                          key={`${warning.code}-${index}`}
                          className="flex items-start gap-2 rounded border border-muted-foreground/30 bg-background p-2"
                        >
                          <ShieldAlert
                            className={`mt-1 h-4 w-4 ${warning.severity === "hard" ? "text-destructive" : "text-warning"}`}
                          />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {warning.severity === "hard"
                                ? "Blocking"
                                : "Advisory"}{" "}
                              • {warning.code.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-foreground">
                              {warning.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("schedule.noConflictsOnThisDraft")}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="title">{t("schedule.title")}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("schedule.shiftTitle2")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="start_time">{t("schedule.startTime")}</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">{t("schedule.endTime")}</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">{t("schedule.location")}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder={t("schedule.shiftLocation")}
                />
              </div>

              <div>
                <Label htmlFor="hourly_rate">{t("schedule.hourlyRate")}</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hourly_rate: e.target.value,
                    })
                  }
                  placeholder={t("schedule.optionalLaborCostRate")}
                />
              </div>

              <div>
                <Label htmlFor="notes">{t("schedule.notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t("schedule.additionalNotes")}
                  rows={3}
                />
              </div>
            </div>

            {/* Assigned Employees */}
            <div className="space-y-3">
              <Label>{t("schedule.assignedEmployees")}</Label>
              <EmployeeSelector
                shiftId={shift.id}
                selectedEmployees={shift.assignments || []}
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={shift.is_published ? "default" : "secondary"}>
                {shift.is_published ? "Published" : "Draft"}
              </Badge>
              {shift.position_id && (
                <Badge variant="outline">
                  Position ID: {shift.position_id}
                </Badge>
              )}
            </div>

          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <ShiftLinkedForms
              role={shift.role || shift.job_position?.name || shift.job_position?.role}
              title={shift.title}
            />
            <ShiftTasksPanel
              scheduleId={shift.id}
              shiftTitle={shift.title || ""}
              shiftEndIso={shift.end_time}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSaveTemplate}
              disabled={templateSaving || !companyId}
            >
              {templateSaving ? "Saving template..." : "Save as Shift Template"}
            </Button>
            <div className="space-y-2">
              <Label htmlFor="shift-template">{t("schedule.loadFromTemplate")}</Label>
              <Select
                value={selectedTemplateId || undefined}
                onValueChange={setSelectedTemplateId}
                disabled={templates.length === 0}
              >
                <SelectTrigger id="shift-template" aria-label={t("schedule.shiftTemplate")}>
                  <SelectValue
                    placeholder={
                      templates.length === 0
                        ? "No templates yet"
                        : "Choose a template"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name || "Untitled template"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLoadTemplate}
                disabled={!selectedTemplateId}
              >
                {t("schedule.loadFromTemplate")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <div className="flex shrink-0 flex-col gap-2 border-t p-6">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>

        {!shift.is_published && (
          <Button
            variant="outline"
            onClick={handlePublish}
            disabled={loading}
          >
            <Eye className="mr-2 h-4 w-4" />
            {t("schedule.publishThisShiftOnly")}
          </Button>
        )}

        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("schedule.deleteShift")}
        </Button>
      </div>
    </Card>
  );
}
