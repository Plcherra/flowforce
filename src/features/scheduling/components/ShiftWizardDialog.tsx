import { useTranslation } from "react-i18next";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useScheduling } from "@/contexts/SchedulingContext";
import { usePositions } from "@/hooks/usePositions";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { parse, differenceInMinutes } from "date-fns";
import { useShiftTemplates } from "@/features/scheduling/hooks/useShiftTemplates";
import { DetailsTab } from "./shift-wizard/DetailsTab";
import { UsersTab } from "./shift-wizard/UsersTab";
import { TasksTab } from "./shift-wizard/TasksTab";
import { NotesTab } from "./shift-wizard/NotesTab";
import type { ShiftTask, ShiftWizardFormData } from "./shift-wizard/types";
import {
  buildShiftConflictWarnings,
  getShiftLaborHours,
} from "@/features/scheduling/utils/scheduleReadiness";
import { queryKeys } from "@/lib/queryKeys";
import { insertTask } from "@/features/tasks/repositories/tasksRepository";
import { logger } from "@/utils/logger";

export interface ShiftWizardTemplateSeed {
  title: string;
  startTime: string;
  endTime: string;
  role: string;
}

interface ShiftWizardDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedDate: Date;
  templateSeed?: ShiftWizardTemplateSeed | null;
  children?: ReactNode;
}

const DEFAULT_BREAK = {
  id: "1",
  start_minutes: 240,
  duration_minutes: 30,
  is_paid: false,
  title: "Lunch Break",
} as const;

const timezoneFallback = "America/New_York";

const parseHourlyRate = (value: string) => {
  if (value.trim().length === 0) return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
};

const createDefaultFormState = (date: Date): ShiftWizardFormData => ({
  title: "",
  date,
  is_all_day: false,
  start_time: "09:30",
  end_time: "17:00",
  timezone: timezoneFallback,
  location: "",
  job_position_id: "",
  job_position_input: "",
  required_headcount: 1,
  hourly_rate: "",
  assignedusers: [],
  can_claim: false,
  breaks: [
    {
      ...DEFAULT_BREAK,
      id: Date.now().toString(),
    },
  ],
  notes: "",
  attachments: [],
  tasks: [],
});

export function ShiftWizardDialog({
  open,
  onOpenChange,
  selectedDate,
  templateSeed = null,
  children,
}: ShiftWizardDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState<ShiftWizardFormData>(() =>
    createDefaultFormState(selectedDate),
  );
  const [loading, setLoading] = useState(false);
  const wasOpenRef = useRef(false);
  const { toast } = useToast();

  const { user } = useAuth();
  const { profile } = useProfile();
  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataCompanyId =
    typeof userMetadata["company_id"] === "string"
      ? (userMetadata["company_id"] as string)
      : null;
  const companyId = profile?.companyId ?? metadataCompanyId ?? null;

  const { positions } = usePositions();
  const { templates: shiftTemplates } = useShiftTemplates();
  const {
    employees,
    loading: employeesLoading,
    getEmployeesByPosition,
    getEmployeeFullName,
  } = useEmployees();
  const {
    shifts,
    weekRange,
    timeOff,
    unavailability,
    staffAvailability,
    isFallbackData,
    refetchAll,
    mutations: { createSchedule, assign },
  } = useScheduling();
  const queryClient = useQueryClient();

  useEffect(() => {
    const justOpened = Boolean(open) && !wasOpenRef.current;
    wasOpenRef.current = Boolean(open);
    if (!open) return;
    if (justOpened) {
      const next = createDefaultFormState(selectedDate);
      if (templateSeed) {
        next.title = templateSeed.title;
        next.start_time = templateSeed.startTime;
        next.end_time = templateSeed.endTime;
        next.job_position_input = templateSeed.role;
      }
      setFormData(next);
      setActiveTab("details");
      return;
    }
    setFormData((prev) =>
      prev.date.getTime() === selectedDate.getTime()
        ? prev
        : { ...prev, date: selectedDate },
    );
  }, [open, selectedDate, templateSeed]);

  const distinctLocations = useMemo(
    () =>
      Array.from(
        new Set(
          (shifts ?? [])
            .map((shift) => shift.location)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [shifts],
  );

  const hours = useMemo(() => {
    if (formData.is_all_day) {
      return { total: 24, net: 24 };
    }

    const start = parse(formData.start_time, "HH:mm", formData.date);
    const end = parse(formData.end_time, "HH:mm", formData.date);
    const totalMinutes = differenceInMinutes(end, start);
    const unpaidBreakMinutes = formData.breaks
      .filter((item) => !item.is_paid)
      .reduce((sum, item) => sum + item.duration_minutes, 0);
    const totalHours = totalMinutes / 60;
    const netHours = (totalMinutes - unpaidBreakMinutes) / 60;

    return { total: totalHours, net: netHours };
  }, [
    formData.breaks,
    formData.date,
    formData.end_time,
    formData.is_all_day,
    formData.start_time,
  ]);

  const getShiftWindow = useCallback(() => {
    const date = formData.date;
    const start = formData.is_all_day
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0)
      : parse(formData.start_time, "HH:mm", date);
    const end = formData.is_all_day
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59)
      : parse(formData.end_time, "HH:mm", date);
    return { start, end };
  }, [
    formData.date,
    formData.end_time,
    formData.is_all_day,
    formData.start_time,
  ]);

  const draftShiftForWarnings = useMemo(
    () => ({
      id: "draft-shift",
      company_id: companyId,
      title: formData.title || "Draft shift",
      role: formData.job_position_input || "Staff",
      start_time: getShiftWindow().start.toISOString(),
      end_time: getShiftWindow().end.toISOString(),
      location: formData.location || null,
      required_headcount: formData.required_headcount,
      break_minutes: formData.breaks.reduce(
        (sum, item) => sum + item.duration_minutes,
        0,
      ),
      hourly_rate: parseHourlyRate(formData.hourly_rate),
      color: "#3b82f6",
      timezone: formData.timezone,
      notes: formData.notes,
      created_at: new Date().toISOString(),
      created_by: user?.id ?? null,
      updated_at: null,
      is_all_day: formData.is_all_day,
      is_published: false,
      is_template: false,
      position_id: formData.job_position_id || null,
      template_id: null,
      status: "scheduled",
      requirements: [],
      user_id: null,
      assignments: formData.assignedusers.map((userId) => ({
        id: `draft-assignment-${userId}`,
        schedule_id: "draft-shift",
        user_id: userId,
        status: "assigned",
        assigned_at: null,
        assigned_by: user?.id ?? null,
        confirmed_at: null,
      })),
    }),
    [companyId, formData, getShiftWindow, user?.id],
  );

  const draftWarnings = useMemo(
    () =>
      buildShiftConflictWarnings({
        shift: draftShiftForWarnings,
        shifts,
        timeOff,
        unavailability,
        staffAvailability,
        assignedUserIds: formData.assignedusers,
      }),
    [
      draftShiftForWarnings,
      formData.assignedusers,
      shifts,
      timeOff,
      unavailability,
      staffAvailability,
    ],
  );

  const draftLaborCost = useMemo(() => {
    const rate = Number(formData.hourly_rate || 0);
    if (!Number.isFinite(rate) || rate <= 0) return 0;
    return getShiftLaborHours(draftShiftForWarnings) * rate;
  }, [draftShiftForWarnings, formData.hourly_rate]);

  const unavailabilityEntries = useMemo(
    () =>
      (unavailability ?? []).map((entry) => ({
        user_id: entry.user_id ?? null,
        start_time: entry.start_time,
        end_time: entry.end_time,
      })),
    [unavailability],
  );

  const isUserAvailableForWindow = (userId: string) => {
    const { start, end } = getShiftWindow();
    const items = unavailabilityEntries.filter(
      (entry) => entry.user_id === userId,
    );
    return !items.some((entry) => {
      const uaStart = new Date(entry.start_time);
      const uaEnd = new Date(entry.end_time);
      return uaStart < end && uaEnd > start;
    });
  };

  const resetForm = () => {
    setFormData(createDefaultFormState(selectedDate));
    setActiveTab("details");
  };

  const persistShiftTasks = async (shiftId: string, shiftEnd: Date) => {
    if (!companyId || !user?.id || formData.tasks.length === 0) return [];

    const errors: string[] = [];
    for (const task of formData.tasks) {
      const title = task.title.trim();
      if (!title) continue;
      try {
        await insertTask({
          title,
          description: task.description.trim() || null,
          priority: task.priority,
          estimated_hours: task.estimated_minutes / 60,
          company_id: companyId,
          created_by: user.id,
          assigned_to: formData.assignedusers[0] ?? null,
          due_date: shiftEnd.toISOString().slice(0, 10),
          status: "todo",
          source: "schedule",
          tags: ["schedule", shiftId],
          links: {
            schedule_id: shiftId,
            shift_title: formData.title || "Untitled shift",
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save shift task";
        logger.error("Failed to save shift task", {
          error: err,
          tags: ["error"],
        });
        errors.push(message);
      }
    }
    return errors;
  };

  const handleAssignUsers = async (shiftId: string) => {
    if (!assign) return;
    const assignments = formData.assignedusers ?? [];
    if (assignments.length === 0) return;

    const errors: string[] = [];
    for (const userId of assignments) {
      try {
        const success = await assign(shiftId, userId);
        if (!success) {
          errors.push(`Failed to assign user ${userId}`);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to assign user to shift";
        logger.error("Failed to assign user to shift", {
          error: err,
          tags: ["error"],
        });
        errors.push(errorMessage);
      }
    }

    if (errors.length > 0) {
      // Note: Individual assignment errors are already shown via toast in the assign function
      // This is just a summary if multiple assignments fail
      logger.warn("Some user assignments failed", {
        context: { errors },
        tags: ["warning"],
      });
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!createSchedule) return;

    setLoading(true);
    try {
      const { start, end } = getShiftWindow();

      const payload = {
        title: formData.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: formData.location,
        is_all_day: formData.is_all_day,
        timezone: formData.timezone,
        required_headcount: formData.required_headcount,
        notes: formData.notes,
        break_minutes: formData.breaks.reduce(
          (sum, item) => sum + item.duration_minutes,
          0,
        ),
        hourly_rate: parseHourlyRate(formData.hourly_rate),
        color: "#3b82f6",
        is_published: publish,
        is_template: false,
        template_id: null,
        position_id: formData.job_position_id || null,
        role: "Staff",
        status: "scheduled",
        user_id: null,
        requirements: [],
      } satisfies Parameters<typeof createSchedule>[0];

      const created = await createSchedule(payload);
      if (created) {
        await handleAssignUsers(created.id);
        const taskErrors = await persistShiftTasks(created.id, end);

        if (companyId && weekRange?.start && weekRange?.end) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.shifts(
                companyId,
                weekRange.start,
                weekRange.end,
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.assignments(
                companyId,
                weekRange.start,
                weekRange.end,
              ),
            }),
          ]);
        }

        await refetchAll();
        onOpenChange?.(false);
        resetForm();

        toast({
          title: taskErrors.length > 0 ? "Shift created, task not saved" : "Shift created",
          description:
            taskErrors.length > 0
              ? taskErrors[0]
              : `Shift "${formData.title || "Untitled"}" has been ${publish ? "published" : "saved as draft"}${formData.tasks.length > 0 ? " and its tasks were added to Tasks." : "."}`,
          variant: taskErrors.length > 0 ? "destructive" : "default",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create shift";
      logger.error("Failed to create shift", { error: err, tags: ["error"] });
      toast({
        title: "Shift creation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onAddTask = (task: ShiftTask) => {
    setFormData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
  };

  const onRemoveTask = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onOpenChange?.(value);
          resetForm();
        } else {
          onOpenChange?.(value);
        }
      }}
    >
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-3xl overflow-hidden p-0 sm:rounded-lg">
        <form
          className="flex h-full max-h-[90dvh] flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave(true);
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              Create New Shift
              {isFallbackData && (
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-wide"
                >
                  {t("schedule.preview")}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("schedule.setUpANewShiftWithDetailedScheduling")}
            </DialogDescription>
            {isFallbackData && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("schedule.liveSchedulingUpdatesAreDisabledWhileDemoData")}
              </p>
            )}
            {draftWarnings.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("schedule.conflictWarning")}</AlertTitle>
                <AlertDescription>
                  {draftWarnings[0]?.message}
                  {draftWarnings.length > 1
                    ? ` ${draftWarnings.length - 1} more conflict${draftWarnings.length === 2 ? "" : "s"} found.`
                    : ""}
                </AlertDescription>
              </Alert>
            )}
          </DialogHeader>

          <Separator />

          <div className="flex-1 min-h-0 px-6 py-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex h-full flex-col"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">{t("schedule.details")}</TabsTrigger>
                <TabsTrigger value="users">{t("schedule.users")}</TabsTrigger>
                <TabsTrigger value="tasks">{t("schedule.tasks")}</TabsTrigger>
                <TabsTrigger value="notes">{t("schedule.notes")}</TabsTrigger>
              </TabsList>

              <div className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4 pb-6">
                    <TabsContent value="details" className="mt-0 space-y-4">
                      <DetailsTab
                        formData={formData}
                        setFormData={setFormData}
                        positions={positions}
                        distinctLocations={distinctLocations}
                        hours={hours}
                        laborCost={draftLaborCost}
                        shiftTemplates={shiftTemplates}
                      />
                    </TabsContent>

                    <TabsContent value="users" className="mt-0 space-y-4">
                      <UsersTab
                        employees={employees}
                        employeesLoading={employeesLoading}
                        getEmployeesByPosition={getEmployeesByPosition}
                        getEmployeeFullName={getEmployeeFullName}
                        formData={formData}
                        setFormData={setFormData}
                        isUserAvailableForWindow={isUserAvailableForWindow}
                      />

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="can-claim"
                          checked={formData.can_claim}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              can_claim: checked,
                            }))
                          }
                        />
                        <Label htmlFor="can-claim">
                          {t("schedule.enableUsersToClaimThisShift")}
                        </Label>
                      </div>

                      {formData.job_position_id && (
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span className="text-sm text-muted-foreground">
                                  {
                                    getEmployeesByPosition(
                                      formData.job_position_id,
                                    ).length
                                  }{" "}
                                  users are qualified for{" "}
                                  {
                                    positions.find(
                                      (position) =>
                                        position.id ===
                                        formData.job_position_id,
                                    )?.name
                                  }
                                </span>
                              </div>
                              <Badge variant="secondary">
                                {
                                  positions.find(
                                    (position) =>
                                      position.id === formData.job_position_id,
                                  )?.name
                                }
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="tasks" className="mt-0 space-y-4">
                      <TasksTab
                        tasks={formData.tasks as ShiftTask[]}
                        onAddTask={onAddTask}
                        onRemoveTask={onRemoveTask}
                      />
                    </TabsContent>

                    <TabsContent value="notes" className="mt-0 space-y-4">
                      <NotesTab
                        notes={formData.notes}
                        onNotesChange={(notes) =>
                          setFormData((prev) => ({ ...prev, notes }))
                        }
                      />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          </div>

          <div className="border-t bg-background px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange?.(false);
                  resetForm();
                }}
              >
                {t("schedule.cancel")}
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {isFallbackData && (
                  <span className="text-xs text-muted-foreground sm:mr-2">
                    {t("schedule.previewModeActionsDisabled")}
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || isFallbackData}
                  onClick={() => handleSave(false)}
                >
                  {loading ? "Saving..." : "Save Draft"}
                </Button>
                <Button type="submit" disabled={loading || isFallbackData}>
                  {loading ? "Publishing..." : "Publish"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
