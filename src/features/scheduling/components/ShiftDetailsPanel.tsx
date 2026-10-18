import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeSelector } from "./EmployeeSelector";
import { TasksTab } from "./shift-wizard/TasksTab";
import type { ShiftTask } from "./shift-wizard/types";
import {
  X,
  Save,
  Eye,
  Trash2,
  Calendar as CalendarIcon,
  Plus,
  Minus,
  ShieldAlert,
} from "lucide-react";
import { useScheduling } from "@/contexts/SchedulingContext";
import { format } from "date-fns";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useShiftTemplates } from "@/features/scheduling/hooks/useShiftTemplates";
import {
  parseCalendarInstant,
  vendorEventStart,
} from "@/features/scheduling/utils/calendarDay";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/public-types";
import {
  deleteTaskRow,
  insertTask,
} from "@/features/tasks/repositories/tasksRepository";
import type {
  CopilotDraftWarning,
  CopilotScheduleMetadata,
} from "@/features/scheduling/services/autoScheduler";
import { logger } from "@/utils/logger";
import { buildShiftConflictWarnings } from "@/features/scheduling/utils/scheduleReadiness";

const vendorLabelLookup: Record<string, string> = {
  ecolab: "Ecolab Service",
  electrician: "Electrician",
  cleaning: "Cleaning Crew",
  inspection: "Health Inspection",
  general: "Vendor Visit",
  vendor_visit: "Vendor visit",
};

const getVendorLabel = (vendorType: string | null | undefined) => {
  if (!vendorType) return "Vendor";
  return vendorLabelLookup[vendorType] ?? vendorType.replace(/_/g, " ");
};

const parseHourlyRate = (value: string) => {
  if (value.trim().length === 0) return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
};

const shiftTaskPriorities = ["low", "medium", "high"] as const;

const visitTypeStorageKey = (companyId: string) =>
  `ff-visit-types:${companyId}`;
const hiddenVisitTypeStorageKey = (companyId: string) =>
  `ff-visit-types-hidden:${companyId}`;

const readStringList = (key: string) => {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const writeStringList = (key: string, values: string[]) => {
  window.localStorage.setItem(key, JSON.stringify(values));
};

const mergeVisitTypes = (current: string[], extra: string[], hidden: Set<string>) => {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of [...current, ...extra]) {
    const label = value.trim();
    const key = label.toLowerCase();
    if (!label || hidden.has(key) || seen.has(key)) continue;
    seen.add(key);
    next.push(label);
  }
  return next.sort((a, b) => a.localeCompare(b));
};

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
  const {
    shifts,
    timeOff,
    unavailability,
    staffAvailability,
    vendorEvents,
    mutations: { updateSchedule, deleteSchedule },
  } = useScheduling();
  const {
    getEventsForShift,
    toggleChecklistItem,
    createVendorVisit,
    linkVisitToShifts,
    updateEvent,
    deleteEvent,
  } = useEvents();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { templates, createTemplate } = useShiftTemplates();
  const [loading, setLoading] = useState(false);
  const [addingVisit, setAddingVisit] = useState(false);
  const [visitSetupOpen, setVisitSetupOpen] = useState(false);
  const [visitForm, setVisitForm] = useState({
    vendorType: "",
    vendorName: "",
    start: "",
    end: "",
    location: "",
    notes: "",
  });
  const [savedTasks, setSavedTasks] = useState<ShiftTask[]>([]);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskDraftReset, setTaskDraftReset] = useState(0);
  const [savedVisitTypes, setSavedVisitTypes] = useState<string[]>([]);
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
  const [eventEdits, setEventEdits] = useState<
    Record<string, { title: string; location?: string | null }>
  >({});

  const shift = shifts.find((s) => s.id === shiftId);
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

  useEffect(() => {
    if (!companyId) {
      setSavedVisitTypes([]);
      return;
    }
    const hidden = new Set(
      readStringList(hiddenVisitTypeStorageKey(companyId)).map((item) =>
        item.toLowerCase(),
      ),
    );
    setSavedVisitTypes(
      mergeVisitTypes(readStringList(visitTypeStorageKey(companyId)), [], hidden),
    );
    let cancelled = false;
    void supabase
      .from("vendor_visits")
      .select("service_type")
      .eq("company_id", companyId)
      .then(({ data }) => {
        if (cancelled || !companyId) return;
        const latestHidden = new Set(
          readStringList(hiddenVisitTypeStorageKey(companyId)).map((item) =>
            item.toLowerCase(),
          ),
        );
        const used = (data ?? [])
          .map((row) => row.service_type)
          .filter((value): value is string => Boolean(value));
        setSavedVisitTypes((current) =>
          mergeVisitTypes(current, used, latestHidden),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleSave = async () => {
    if (!shift) return;

    setLoading(true);
    try {
      await updateSchedule(shift.id, {
        ...formData,
        hourly_rate: parseHourlyRate(formData.hourly_rate),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      });

      const draft = taskDraftRef.current;
      if (draft?.title.trim()) {
        await addTaskRef.current({
          id: `draft-${Date.now()}`,
          ...draft,
        });
      }

      // Persist edits for linked events (title/location) using same Save action
      const linked = getEventsForShift(shift.id);
      for (const ev of linked) {
        const edit = eventEdits[ev.id];
        if (!edit) continue;
        const updates: Partial<{ title: string; location?: string | null }> =
          {};
        if (typeof edit.title === "string" && edit.title !== ev.title)
          updates.title = edit.title;
        if (typeof edit.location === "string" && edit.location !== ev.location)
          updates.location = edit.location;
        if (Object.keys(updates).length > 0) {
          await updateEvent(ev.id, updates);
        }
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

  const saveCurrentVisitType = () => {
    const label = visitForm.vendorType.trim();
    if (!label || !companyId) return;
    const hidden = readStringList(hiddenVisitTypeStorageKey(companyId)).filter(
      (item) => item.toLowerCase() !== label.toLowerCase(),
    );
    writeStringList(hiddenVisitTypeStorageKey(companyId), hidden);
    const next = mergeVisitTypes(savedVisitTypes, [label], new Set());
    writeStringList(visitTypeStorageKey(companyId), next);
    setSavedVisitTypes(next);
  };

  const deleteVisitType = (label: string) => {
    const name = label.trim();
    if (!name || !companyId) return;
    const hidden = readStringList(hiddenVisitTypeStorageKey(companyId));
    if (!hidden.some((item) => item.toLowerCase() === name.toLowerCase())) {
      writeStringList(hiddenVisitTypeStorageKey(companyId), [...hidden, name]);
    }
    const next = savedVisitTypes.filter(
      (item) => item.toLowerCase() !== name.toLowerCase(),
    );
    writeStringList(visitTypeStorageKey(companyId), next);
    setSavedVisitTypes(next);
    if (visitForm.vendorType.trim().toLowerCase() === name.toLowerCase()) {
      setVisitForm((current) => ({ ...current, vendorType: "" }));
    }
  };

  const openVisitSetup = () => {
    if (!shift) return;
    setVisitForm({
      vendorType: "",
      vendorName: "",
      start: format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm"),
      end: format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm"),
      location: shift.location || "",
      notes: "",
    });
    setVisitSetupOpen(true);
  };

  const handleAddVendorVisit = async () => {
    if (!shift || addingVisit) return;
    const start = new Date(visitForm.start);
    const end = new Date(visitForm.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast({
        title: "Check the visit times",
        description: "End time has to be after the start time.",
        variant: "destructive",
      });
      return;
    }
    const typedVisit = visitForm.vendorType.trim();
    const vendorName = visitForm.vendorName.trim() || typedVisit || "Vendor visit";
    const serviceType = typedVisit || vendorName;
    setAddingVisit(true);
    try {
      const ev = await createVendorVisit({
        title: vendorName,
        description: visitForm.notes.trim() || undefined,
        start: start.toISOString(),
        end: end.toISOString(),
        location: visitForm.location.trim() || shift.location || undefined,
        vendor: { name: vendorName, service_type: serviceType },
        related_shift_ids: [shift.id],
      });
      try {
        await linkVisitToShifts(ev.id, [shift.id]);
      } catch (linkError) {
        logger.warn("Vendor visit saved without a shift link refresh", {
          error: linkError,
          tags: ["warning"],
        });
      }
      if (typedVisit) saveCurrentVisitType();
      setVisitSetupOpen(false);
      toast({
        title: "Vendor visit linked",
        description: `${vendorName} is saved on this shift.`,
      });
    } catch (error) {
      logger.error("Error linking vendor visit", { error, tags: ["error"] });
    } finally {
      setAddingVisit(false);
    }
  };

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

  const linkedEvents = useMemo(
    () => (shift ? getEventsForShift(shift.id) : []),
    [getEventsForShift, shift],
  );
  const linkedVendorVisits = useMemo(
    () =>
      shift ? vendorEvents.filter((event) => event.shift_id === shift.id) : [],
    [shift, vendorEvents],
  );
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

  useEffect(() => {
    if (!shift) {
      setEventEdits({});
      return;
    }

    const buffer: Record<string, { title: string; location?: string | null }> =
      {};
    linkedEvents.forEach((event) => {
      buffer[event.id] = {
        title: event.title || "",
        location: event.location ?? null,
      };
    });
    setEventEdits(buffer);
  }, [linkedEvents, shift]);

  if (!shift) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shift Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Shift not found</p>
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
            Shift Details
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close shift details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              {linkedVendorVisits.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Vendor Visits</span>
                    <Badge variant="outline">{linkedVendorVisits.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {linkedVendorVisits.map((event) => {
                      const start = vendorEventStart(event);
                      const end = parseCalendarInstant(event.end_time);
                      return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-muted-foreground">
                          {getVendorLabel(event.service_type || event.vendor_name)}
                        </span>
                        <span className="text-muted-foreground">
                          {start ? format(start, "MMM d · HH:mm") : "—"}
                          {end ? `–${format(end, "HH:mm")}` : ""}
                        </span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {conflictWarnings.length > 0 && (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-800">
                      Conflict Warnings
                    </span>
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-red-700"
                    >
                      {conflictWarnings.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {conflictWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className="rounded-md border border-red-200 bg-background p-2 text-sm text-muted-foreground"
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
                      <p className="text-sm font-semibold">AI Copilot Draft</p>
                      <p className="text-xs text-muted-foreground">
                        Run {copilotMeta.runId?.slice?.(0, 8) ?? "—"} •{" "}
                        {copilotMeta.status ?? "draft-only"}
                      </p>
                    </div>
                    <Badge variant="outline">Draft</Badge>
                  </div>
                  {copilotWarnings.length > 0 ? (
                    <div className="space-y-2">
                      {copilotWarnings.map((warning, index) => (
                        <div
                          key={`${warning.code}-${index}`}
                          className="flex items-start gap-2 rounded border border-muted-foreground/30 bg-background p-2"
                        >
                          <ShieldAlert
                            className={`mt-1 h-4 w-4 ${warning.severity === "hard" ? "text-destructive" : "text-amber-500"}`}
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
                      No conflicts on this draft.
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Shift title"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
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
                  <Label htmlFor="end_time">End Time</Label>
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
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Shift location"
                />
              </div>

              <div>
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
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
                  placeholder="Optional labor cost rate"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Assigned Employees */}
            <div className="space-y-3">
              <Label>Assigned Employees</Label>
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

            {/* Linked Events */}
            <div className="space-y-2 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Linked Events</h4>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={openVisitSetup}
                  disabled={addingVisit}
                  title="Add vendor visit"
                  aria-label="Add vendor visit"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {visitSetupOpen && (
                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <p className="text-sm font-medium">Schedule vendor visit</p>
                  <div className="space-y-2">
                    <Label htmlFor="visit-type">Visit type</Label>
                    <div className="relative">
                      <Input
                        id="visit-type"
                        value={visitForm.vendorType}
                        placeholder="Type a visit type"
                        className="pr-16"
                        onChange={(event) =>
                          setVisitForm((current) => ({
                            ...current,
                            vendorType: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveCurrentVisitType();
                          }
                        }}
                      />
                      <div className="absolute inset-y-0 right-1 flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Save visit type"
                          title="Save visit type"
                          disabled={!visitForm.vendorType.trim()}
                          onClick={saveCurrentVisitType}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Delete visit type"
                          title="Delete visit type"
                          disabled={
                            !savedVisitTypes.some(
                              (type) =>
                                type.toLowerCase() ===
                                visitForm.vendorType.trim().toLowerCase(),
                            )
                          }
                          onClick={() => deleteVisitType(visitForm.vendorType)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {savedVisitTypes.length > 0 && (
                      <div className="space-y-1">
                        {savedVisitTypes.map((type) => (
                          <div
                            key={type.toLowerCase()}
                            className="flex items-center gap-1 rounded-md border bg-background px-2"
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 truncate py-1.5 text-left text-sm"
                              onClick={() =>
                                setVisitForm((current) => ({
                                  ...current,
                                  vendorType: type,
                                }))
                              }
                            >
                              {type}
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              aria-label={`Delete ${type}`}
                              title={`Delete ${type}`}
                              onClick={() => deleteVisitType(type)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-name">Vendor name</Label>
                    <Input
                      id="visit-name"
                      value={visitForm.vendorName}
                      placeholder={getVendorLabel(visitForm.vendorType)}
                      onChange={(event) =>
                        setVisitForm((current) => ({
                          ...current,
                          vendorName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="visit-start">Start</Label>
                      <Input
                        id="visit-start"
                        type="datetime-local"
                        value={visitForm.start}
                        onChange={(event) =>
                          setVisitForm((current) => ({
                            ...current,
                            start: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visit-end">End</Label>
                      <Input
                        id="visit-end"
                        type="datetime-local"
                        value={visitForm.end}
                        onChange={(event) =>
                          setVisitForm((current) => ({
                            ...current,
                            end: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-location">Location</Label>
                    <Input
                      id="visit-location"
                      value={visitForm.location}
                      placeholder="Where they should go"
                      onChange={(event) =>
                        setVisitForm((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-notes">Notes</Label>
                    <Textarea
                      id="visit-notes"
                      rows={2}
                      value={visitForm.notes}
                      placeholder="What should the shift do for this visit?"
                      onChange={(event) =>
                        setVisitForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAddVendorVisit}
                      disabled={addingVisit}
                    >
                      {addingVisit ? "Saving visit..." : "Save visit"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setVisitSetupOpen(false)}
                      disabled={addingVisit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {linkedEvents.length === 0 && !visitSetupOpen && (
                <p className="text-xs text-muted-foreground">
                  No events linked to this shift.
                </p>
              )}

              {linkedEvents.map((ev) => (
                <div key={ev.id} className="rounded-md border p-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        value={eventEdits[ev.id]?.title ?? ev.title}
                        onChange={(e) =>
                          setEventEdits((s) => ({
                            ...s,
                            [ev.id]: {
                              ...(s[ev.id] || { title: "" }),
                              title: e.target.value,
                            },
                          }))
                        }
                        className="h-8 text-sm"
                        placeholder="Event title"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(ev.start).toLocaleString()}{" "}
                        {ev.end
                          ? "– " + new Date(ev.end).toLocaleTimeString()
                          : ""}
                      </div>
                      <div className="mt-2">
                        <Input
                          value={
                            eventEdits[ev.id]?.location ?? ev.location ?? ""
                          }
                          onChange={(e) =>
                            setEventEdits((s) => ({
                              ...s,
                              [ev.id]: {
                                ...(s[ev.id] || { title: ev.title }),
                                location: e.target.value,
                              },
                            }))
                          }
                          className="h-8 text-sm"
                          placeholder="Location"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getVendorLabel(ev.vendor?.service_type || ev.type)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete event"
                        aria-label="Delete event"
                        onClick={async () => {
                          if (confirm("Delete this linked event?")) {
                            await deleteEvent(ev.id);
                          }
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {ev.checklist && ev.checklist.length > 0 && (
                    <div className="space-y-1">
                      {ev.checklist.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Checkbox
                            checked={item.done}
                            onCheckedChange={(v) =>
                              toggleChecklistItem(ev.id, item.id, Boolean(v))
                            }
                          />
                          <span>{item.text}</span>
                          {item.who && (
                            <Badge
                              variant="secondary"
                              className="ml-2 capitalize"
                            >
                              {item.who}
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <TasksTab
              tasks={shiftTasks}
              onAddTask={handleAddTask}
              onRemoveTask={handleRemoveTask}
              onDraftChange={handleTaskDraftChange}
              draftResetKey={taskDraftReset}
            />
            {shiftTasks.length === 0 && !shiftTasksQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                No tasks on this shift yet. Add one here, or type it and use Save Changes.
              </p>
            )}
            {taskError && (
              <p className="text-sm text-destructive">{taskError}</p>
            )}
            {shiftTasksQuery.isError && (
              <p className="text-sm text-destructive">
                Saved tasks could not be reloaded. A task you just added still stays in this list.
              </p>
            )}
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
              <Label htmlFor="shift-template">Load from Template</Label>
              <Select
                value={selectedTemplateId || undefined}
                onValueChange={setSelectedTemplateId}
                disabled={templates.length === 0}
              >
                <SelectTrigger id="shift-template" aria-label="Shift template">
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
                Load from Template
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
            Publish this shift only
          </Button>
        )}

        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Shift
        </Button>
      </div>
    </Card>
  );
}
