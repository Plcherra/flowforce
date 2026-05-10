import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Lock,
  Unlock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  getLockStateForWeek,
  allowEdit,
  computeAutoLockThreshold,
  startOfIsoWeek,
} from "@/features/availability/utils/lockEngine";
import type { LockEngineDeps } from "@/features/availability/utils/lockEngine";
import { useToast } from "@/hooks/use-toast";
import type {
  AvailabilityLockMode,
  AvailabilityRequest,
  AvailabilityException,
  OrgPrefs,
} from "@/types/availability";
import { notifyManagersNewRequest } from "@/notifications/availability";
import { logger } from "@/utils/logger";

const HOURS = Array.from({ length: 16 }).map((_, index) => 6 + index); // 06:00 -> 21:00
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type AvailabilityGrid = Record<number, number[]>; // 0 = Monday ... 6 = Sunday

export interface AvailabilityRequestFormProps {
  orgId: string;
  employeeId: string;
  weekStart: string; // ISO string (Monday)
  initialAvailability: AvailabilityGrid;
  onSaveDirect?: (nextAvailability: AvailabilityGrid) => Promise<void>;
}

interface LockInfo {
  baseMode: AvailabilityLockMode;
  state: Awaited<ReturnType<typeof getLockStateForWeek>>;
  nextLock?: Date | null;
  deps: LockEngineDeps;
}

const toISODate = (date: Date | dayjs.Dayjs) => {
  if (dayjs.isDayjs(date)) {
    return date.format("YYYY-MM-DD");
  }
  return date.toISOString().slice(0, 10);
};

const getDateForOffset = (weekStart: string, offset: number) => {
  const base = dayjs(weekStart);
  return base.add(offset, "day");
};

const hashGrid = (grid: AvailabilityGrid) =>
  JSON.stringify(grid, Object.keys(grid).sort());

const cloneGrid = (grid: AvailabilityGrid): AvailabilityGrid => {
  const next: AvailabilityGrid = {};
  Object.entries(grid).forEach(([day, hours]) => {
    next[Number(day)] = [...(hours ?? [])];
  });
  return next;
};

export function AvailabilityRequestForm({
  orgId,
  employeeId,
  weekStart,
  initialAvailability,
  onSaveDirect,
}: AvailabilityRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingGrid, setEditingGrid] = useState<AvailabilityGrid>(() =>
    cloneGrid(initialAvailability),
  );
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestStart, setRequestStart] = useState(weekStart);
  const [requestEnd, setRequestEnd] = useState(
    toISODate(getDateForOffset(weekStart, 6)),
  );

  const { data: lockInfo, isLoading: lockInfoLoading, error: lockInfoError } = useQuery<LockInfo>({
    queryKey: ["availability-lock-info", orgId, weekStart],
    queryFn: async () => {
      const { data: prefData, error: prefError } = await supabase
        .from("org_prefs")
        .select(
          "id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour",
        )
        .eq("id", orgId)
        .maybeSingle();

      if (prefError) {
        throw prefError;
      }

      const prefs: OrgPrefs | null = prefData
        ? {
            id: prefData.id,
            availabilityLockMode:
              prefData.availability_lock_mode as AvailabilityLockMode,
            autoLockDayOfWeek: prefData.auto_lock_day_of_week ?? 4,
            autoLockHour: prefData.auto_lock_hour ?? 17,
            createdAt: "",
            updatedAt: "",
          }
        : null;

      const weekStartDate = weekStart;
      const start = dayjs(weekStartDate);
      const end = start.add(6, "day");
      // Convert dayjs to Date for format() calls

      // TODO: Regenerate Supabase types to include availability_exception table
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from("availability_exception" as any)
        .select(
          "id, employee_id, start_date, end_date, reason, approved_by, created_at, updated_at",
        )
        .lte("start_date", end.format("YYYY-MM-DD"))
        .gte("end_date", start.format("YYYY-MM-DD"))
        .not("approved_by", "is", null);

      if (exceptionsError) {
        throw exceptionsError;
      }

      if (!Array.isArray(exceptionsData)) {
        throw new Error("Expected array from availability_exception query");
      }

      const exceptions: AvailabilityException[] = exceptionsData.map(
        (row: any) => ({
          id: row.id,
          employeeId: row.employee_id,
          startDate: row.start_date,
          endDate: row.end_date,
          reason: row.reason ?? null,
          approvedBy: row.approved_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
      );

      const overrides: LockEngineDeps = {
        getOrgPref: async () =>
          prefs
            ? {
                id: prefs.id,
                availability_lock_mode: prefs.availabilityLockMode,
                auto_lock_day_of_week: prefs.autoLockDayOfWeek,
                auto_lock_hour: prefs.autoLockHour,
              }
            : null,
        getApprovedExceptions: async () =>
          exceptions.map((exception) => ({
            employee_id: exception.employeeId,
            start_date: exception.startDate,
            end_date: exception.endDate,
            approved_by: exception.approvedBy,
          })),
        hasApprovedException: async (_orgId, employee, date) =>
          exceptions.some(
            (exception) =>
              exception.employeeId === employee &&
              exception.approvedBy &&
              exception.startDate <= date &&
              exception.endDate >= date,
          ),
      };

      const state = await getLockStateForWeek({
        orgId,
        weekStart: weekStartDate,
        deps: overrides,
      });

      const baseMode = prefs?.availabilityLockMode ?? "open";
      const nextLock =
        prefs && prefs.availabilityLockMode === "auto"
          ? computeAutoLockThreshold(weekStartDate, {
              auto_lock_day_of_week: prefs.autoLockDayOfWeek,
              auto_lock_hour: prefs.autoLockHour,
              availability_lock_mode: "auto" as Database["public"]["Enums"]["availability_lock_mode"],
              id: prefs.id,
            })
          : null;

      return {
        baseMode,
        state,
        nextLock,
        deps: overrides,
      };
    },
  });

  const { data: allowMap } = useQuery<Record<string, boolean>>({
    queryKey: ["availability-allow-edit", orgId, employeeId, weekStart],
    enabled: Boolean(lockInfo),
    queryFn: async () => {
      if (!lockInfo) return {};
      const dates = DAY_LABELS.map((_, index) =>
        getDateForOffset(weekStart, index).format("YYYY-MM-DD"),
      );
      const entries = await Promise.all(
        dates.map(async (date) => {
          const result = await allowEdit({
            orgId,
            employeeId,
            date,
            deps: lockInfo.deps,
          });
          return [date, result] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  const { data: lastRequest } = useQuery<AvailabilityRequest | null>({
    queryKey: ["availability-last-request", employeeId],
    queryFn: async () => {
      // TODO: Regenerate Supabase types to include availability_request table
      const { data, error } = await supabase
        .from("availability_request" as any)
        .select(
          "id, created_at, status, week_start, manager_id, decision_note, payload",
        )
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) return null;

      // Type assertion for data since table is not in generated types
      const requestData = data as {
        id: string;
        created_at: string;
        manager_id: string | null;
        decision_note: string | null;
        payload: Record<string, unknown> | null;
        status: "pending" | "approved" | "denied";
        week_start: string;
      };

      return {
        id: requestData.id,
        createdAt: requestData.created_at,
        managerId: requestData.manager_id,
        decisionNote: requestData.decision_note,
        payload: requestData.payload ?? {},
        status: requestData.status,
        weekStart: requestData.week_start,
        employeeId,
        updatedAt: requestData.created_at,
      };
    },
    onError: (error) => {
      logger.error("Error loading last request", { error, tags: ["error"] });
      // Don't show toast for this - it's not critical if it fails
    },
  });

  const directEditAllowed = useMemo(() => {
    if (!lockInfo) return false;
    if (lockInfo.state === "open") return true;
    if (!allowMap) return false;
    return Object.values(allowMap).some(Boolean);
  }, [lockInfo, allowMap]);

  const locked = useMemo(() => {
    if (!lockInfo) return false;
    if (lockInfo.state === "open") return false;
    if (lockInfo.state === "locked") return true;
    return lockInfo.state.mode !== "open-with-exceptions";
  }, [lockInfo]);

  const toggleCell = (dayIndex: number, hour: number) => {
    const date = getDateForOffset(weekStart, dayIndex).format("YYYY-MM-DD");
    if (!directEditAllowed || (allowMap && allowMap[date] === false)) return;
    setEditingGrid((prev) => {
      const next = cloneGrid(prev);
      const hours = new Set(next[dayIndex] ?? []);
      if (hours.has(hour)) {
        hours.delete(hour);
      } else {
        hours.add(hour);
      }
      next[dayIndex] = Array.from(hours).sort((a, b) => a - b);
      return next;
    });
  };

  const hasChanges = useMemo(
    () => hashGrid(editingGrid) !== hashGrid(initialAvailability),
    [editingGrid, initialAvailability],
  );

  const diffSummary = useMemo(() => {
    const diff: { day: string; added: number[]; removed: number[] }[] = [];
    DAY_LABELS.forEach((label, index) => {
      const original = new Set(initialAvailability[index] ?? []);
      const updated = new Set(editingGrid[index] ?? []);
      const added = Array.from(updated).filter((hour) => !original.has(hour));
      const removed = Array.from(original).filter((hour) => !updated.has(hour));
      if (added.length || removed.length) {
        diff.push({ day: label, added, removed });
      }
    });
    return diff;
  }, [editingGrid, initialAvailability]);

  const directSave = useMutation({
    mutationFn: async () => {
      if (!onSaveDirect) {
        throw new Error("Direct save handler not provided");
      }
      await onSaveDirect(editingGrid);
    },
    onSuccess: () => {
      toast({
        title: "Availability saved",
        description: "Your availability updates have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["availability-last-request", employeeId] });
    },
    onError: (error) => {
      logger.error("Error saving availability", { error, tags: ["error"] });
      toast({
        title: "Unable to save",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: employeeId,
        week_start: weekStart,
        payload: {
          requestedRange: { start: requestStart, end: requestEnd },
          reason: requestReason,
          desiredAvailability: editingGrid,
        },
        status: "pending",
      };

      // TODO: Regenerate Supabase types to include availability_request table
      const { data, error } = await supabase
        .from("availability_request" as any)
        .insert(payload)
        .select()
        .single();
      if (error || !data) throw error ?? new Error("Unable to create request");
      // Type assertion for data since table is not in generated types
      const insertData = data as { id: string };

      // TODO: Regenerate Supabase types to include audit_log table
      await supabase.from("audit_log" as any).insert({
        actor_id: employeeId,
        action: "availability.request.submitted",
        entity: "availability_request",
        entity_id: payload.employee_id,
        meta: payload.payload,
      });

      await notifyManagersNewRequest(data.id);

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Managers have been notified of your request.",
      });
      setRequestDialogOpen(false);
      setRequestReason("");
      queryClient.invalidateQueries({ queryKey: ["availability-last-request", employeeId] });
    },
    onError: (error) => {
      logger.error("Error submitting availability request", {
        error,
        tags: ["error"],
      });
      toast({
        title: "Unable to submit request",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const applyPreset = (preset: "sat" | "weekend" | "custom") => {
    if (preset === "sat") {
      const saturday = getDateForOffset(weekStart, 5).format("YYYY-MM-DD");
      setRequestStart(saturday);
      setRequestEnd(saturday);
    } else if (preset === "weekend") {
      setRequestStart(getDateForOffset(weekStart, 5).format("YYYY-MM-DD"));
      setRequestEnd(getDateForOffset(weekStart, 6).format("YYYY-MM-DD"));
    } else {
      setRequestStart(weekStart);
      setRequestEnd(getDateForOffset(weekStart, 6).format("YYYY-MM-DD"));
    }
  };

  const lockLabel = useMemo(() => {
    if (!lockInfo) return "Loading...";
    switch (lockInfo.state) {
      case "open":
        return "Open";
      case "locked":
        return "Locked";
      default:
        return "Locked (with exceptions)";
    }
  }, [lockInfo]);

  const nextLockFormatted = useMemo(() => {
    if (!lockInfo?.nextLock) return null;
    return dayjs(lockInfo.nextLock).format("ddd h:mm A");
  }, [lockInfo]);

  const statusBadge = useMemo(() => {
    if (!lastRequest) return null;
    const variant =
      lastRequest.status === "approved"
        ? "default"
        : lastRequest.status === "denied"
          ? "destructive"
          : "secondary";
    return <Badge variant={variant}>Last request: {lastRequest.status}</Badge>;
  }, [lastRequest]);

  return (
    <Card className="border bg-background shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold">
              Availability
            </CardTitle>
            <CardDescription>
              Manage your weekly availability. Locked weeks require a manager
              review.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            <Badge
              variant={lockInfo?.state === "open" ? "default" : "outline"}
              className="flex items-center gap-1"
            >
              {lockInfo?.state !== "open" ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
              Current lock: {lockLabel}
            </Badge>
            {lockInfo?.baseMode === "auto" && nextLockFormatted && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Next lock: {nextLockFormatted}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "rounded-lg border",
            directEditAllowed
              ? "border-border"
              : "border-dashed border-destructive/50 bg-destructive/5",
          )}
        >
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Week of {dayjs(weekStart).format("MMM D, YYYY")}</span>
            {!directEditAllowed && (
              <span className="flex items-center gap-1 text-destructive">
                <Lock className="h-3 w-3" />
                Locked — submit a request to change availability
              </span>
            )}
          </div>
          <ScrollArea className="max-h-[360px] w-full">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-muted/80 px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Hour
                  </th>
                  {DAY_LABELS.map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="sticky left-0 bg-muted/80 px-3 py-2 text-xs text-muted-foreground">
                      {dayjs().hour(hour).minute(0).format("h A")}
                    </td>
                    {DAY_LABELS.map((_, dayIndex) => {
                      const dateISO = getDateForOffset(
                        weekStart,
                        dayIndex,
                      ).format("YYYY-MM-DD");
                      const isSelected = editingGrid[dayIndex]?.includes(hour);
                      const disabled =
                        !directEditAllowed ||
                        (allowMap && allowMap[dateISO] === false);
                      return (
                        <td key={`${dayIndex}-${hour}`} className="px-3 py-1.5">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleCell(dayIndex, hour)}
                            className={cn(
                              "flex h-8 w-full items-center justify-center rounded border text-xs transition",
                              disabled
                                ? "cursor-not-allowed border-dashed border-muted-foreground/30 text-muted-foreground/50"
                                : "border border-muted-foreground/30 hover:border-primary",
                              isSelected &&
                                !disabled &&
                                "bg-primary text-primary-foreground hover:bg-primary/90",
                              isSelected &&
                                disabled &&
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            {directEditAllowed
              ? "Changes save instantly for unlocked days."
              : "Week is locked. Submit a request to update availability."}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingGrid(cloneGrid(initialAvailability))}
              disabled={!hasChanges}
            >
              Reset
            </Button>
            <Button
              onClick={() => directSave.mutate()}
              disabled={!directEditAllowed || !hasChanges}
            >
              Save changes
            </Button>
            <Dialog
              open={requestDialogOpen}
              onOpenChange={setRequestDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                  Request change
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Request availability change</DialogTitle>
                  <DialogDescription>
                    Provide the timeframe and reason for your change. Managers
                    will review and respond.
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="custom" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="sat" onClick={() => applyPreset("sat")}>
                      Sat only
                    </TabsTrigger>
                    <TabsTrigger
                      value="weekend"
                      onClick={() => applyPreset("weekend")}
                    >
                      Weekend
                    </TabsTrigger>
                    <TabsTrigger
                      value="custom"
                      onClick={() => applyPreset("custom")}
                    >
                      Custom
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="sat" className="space-y-3">
                    <RequestRangeInputs
                      start={requestStart}
                      end={requestEnd}
                      onChange={(next) => {
                        setRequestStart(next.start);
                        setRequestEnd(next.end);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="weekend" className="space-y-3">
                    <RequestRangeInputs
                      start={requestStart}
                      end={requestEnd}
                      onChange={(next) => {
                        setRequestStart(next.start);
                        setRequestEnd(next.end);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="custom" className="space-y-3">
                    <RequestRangeInputs
                      start={requestStart}
                      end={requestEnd}
                      onChange={(next) => {
                        setRequestStart(next.start);
                        setRequestEnd(next.end);
                      }}
                    />
                  </TabsContent>
                </Tabs>
                <div className="space-y-2">
                  <Label htmlFor="request-reason">Reason</Label>
                  <Textarea
                    id="request-reason"
                    placeholder="Explain why you need the change..."
                    value={requestReason}
                    onChange={(event) => setRequestReason(event.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Changes preview
                  </p>
                  {diffSummary.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No changes selected yet.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {diffSummary.map((entry) => (
                        <li key={entry.day}>
                          <span className="font-semibold">{entry.day}:</span>{" "}
                          {entry.added.length > 0 && (
                            <span className="text-emerald-600">
                              +{" "}
                              {entry.added
                                .map((hour) => dayjs().hour(hour).format("h A"))
                                .join(", ")}
                            </span>
                          )}
                          {entry.added.length > 0 &&
                            entry.removed.length > 0 && <span> · </span>}
                          {entry.removed.length > 0 && (
                            <span className="text-destructive">
                              −{" "}
                              {entry.removed
                                .map((hour) => dayjs().hour(hour).format("h A"))
                                .join(", ")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setRequestDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => submitRequest.mutate()}
                    disabled={
                      requestReason.trim().length === 0 ||
                      diffSummary.length === 0
                    }
                  >
                    Submit request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RequestRangeInputsProps {
  start: string;
  end: string;
  onChange: (next: { start: string; end: string }) => void;
}

function RequestRangeInputs({ start, end, onChange }: RequestRangeInputsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label
          htmlFor="request-start"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Calendar className="h-3 w-3" />
          Start date
        </Label>
        <Input
          id="request-start"
          type="date"
          value={start}
          onChange={(event) => onChange({ start: event.target.value, end })}
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="request-end"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Calendar className="h-3 w-3" />
          End date
        </Label>
        <Input
          id="request-end"
          type="date"
          value={end}
          min={start}
          onChange={(event) => onChange({ start, end: event.target.value })}
        />
      </div>
    </div>
  );
}

export default AvailabilityRequestForm;
