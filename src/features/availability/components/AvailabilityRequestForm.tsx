import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { AlertCircle, Clock, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RepeatPatternEditor,
  repeatChoiceKey,
  type RepeatEditorValue,
} from "@/features/availability/components/RepeatPatternEditor";
import {
  applyChoiceToDays,
  availabilityAnchorDate,
  choiceFromPattern,
  type RepeatPattern,
} from "@/features/scheduling/utils/repeatPattern";
import { supabase } from "@/integrations/supabase/client";
import {
  getLockStateForWeek,
  computeAutoLockThreshold,
} from "@/features/availability/utils/lockEngine";
import type { LockEngineDeps } from "@/features/availability/utils/lockEngine";
import { useToast } from "@/hooks/use-toast";
import type {
  AvailabilityLockMode,
  AvailabilityException,
  OrgPrefs,
} from "@/types/availability";
import { sendAvailabilityAction } from "@/features/availability/utils/sendAvailabilityAction";
import { logger } from "@/utils/logger";
import { clockRangeFromHours } from "@/features/availability/utils/availabilityUtils";
import {
  dayAvailabilityState,
  hoursAfterTimeEdit,
  hoursForDayState,
} from "@/features/availability/utils/dayAvailabilityState";
import { useTranslation } from "react-i18next";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type AvailabilityGrid = Record<number, number[]>; // 0 = Monday ... 6 = Sunday

export interface AvailabilityRequestFormProps {
  orgId: string;
  employeeId: string;
  weekStart: string; // ISO string (Monday)
  initialAvailability: AvailabilityGrid;
  initialRepeats?: Record<number, RepeatPattern | null>;
  onSaveDirect?: (
    nextAvailability: AvailabilityGrid,
    repeats?: Record<number, RepeatPattern | null>,
    windowStart?: string,
  ) => Promise<void>;
}

interface LockInfo {
  baseMode: AvailabilityLockMode;
  state: Awaited<ReturnType<typeof getLockStateForWeek>>;
  nextLock?: Date | null;
  deps: LockEngineDeps;
  availabilityChoice: "open" | "fixed" | null;
  windowStartWeekday: number | null;
  windowEndWeekday: number | null;
  postingWeekday: number | null;
}

const hashGrid = (grid: AvailabilityGrid) =>
  JSON.stringify(grid, Object.keys(grid).sort());

const cloneGrid = (grid: AvailabilityGrid): AvailabilityGrid => {
  const next: AvailabilityGrid = {};
  Object.entries(grid).forEach(([day, hours]) => {
    next[Number(day)] = [...(hours ?? [])];
  });
  return next;
};

const editorForPattern = (
  weekStart: string,
  day: number,
  pattern: RepeatPattern | null,
): RepeatEditorValue => ({
  choice: choiceFromPattern(pattern),
  interval: pattern ? String(pattern.interval) : "1",
  unit: pattern?.unit ?? "days",
  anchor: pattern?.anchor ?? availabilityAnchorDate(weekStart, day) ?? weekStart,
});

export function AvailabilityRequestForm({
  orgId,
  employeeId,
  weekStart,
  initialAvailability,
  initialRepeats,
  onSaveDirect,
}: AvailabilityRequestFormProps) {
  const { t } = useTranslation();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [patterns, setPatterns] = useState<Record<number, RepeatPattern | null>>(
    () => ({ ...(initialRepeats ?? {}) }),
  );
  const [editor, setEditor] = useState<RepeatEditorValue>(() =>
    editorForPattern(weekStart, 0, null),
  );
  const { toast } = useToast();

  const [editingGrid, setEditingGrid] = useState<AvailabilityGrid>(() =>
    cloneGrid(initialAvailability),
  );

  const { data: lockInfo, isLoading: _lockInfoLoading, error: _lockInfoError } = useQuery<LockInfo>({
    queryKey: ["availability-lock-info", orgId, weekStart],
    queryFn: async () => {
      const { data: prefData, error: prefError } = await supabase
        .from("org_prefs")
        .select(
          "id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour, availability_choice, schedule_window_start_weekday, schedule_window_end_weekday, schedule_posting_weekday",
        )
        .eq("id", orgId)
        .maybeSingle();

      if (prefError) {
        throw prefError;
      }

      const storedChoice = prefData?.availability_choice;
      const availabilityChoice =
        storedChoice === "open" || storedChoice === "fixed" ? storedChoice : null;

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
            })
          : null;

      return {
        baseMode,
        state,
        nextLock,
        deps: overrides,
        availabilityChoice,
        windowStartWeekday: prefData?.schedule_window_start_weekday ?? null,
        windowEndWeekday: prefData?.schedule_window_end_weekday ?? null,
        postingWeekday: prefData?.schedule_posting_weekday ?? null,
      };
    },
  });

  const availabilityIsOpen = lockInfo?.availabilityChoice === "open";

  const sendAction = useMemo(() => {
    const start = lockInfo?.windowStartWeekday;
    const end = lockInfo?.windowEndWeekday;
    const posting = lockInfo?.postingWeekday;
    if (start == null || end == null || posting == null) return null;
    return sendAvailabilityAction(
      {
        sendDate: new Date().toISOString().slice(0, 10),
        postingWeekday: posting,
        windowStartWeekday: start,
        windowEndWeekday: end,
      },
      lockInfo?.state !== "open",
    );
  }, [lockInfo]);

  const dayIsEditable = (_dayIndex: number) => true;

  const setDayHours = (dayIndex: number, hours: number[]) => {
    if (!dayIsEditable(dayIndex)) return;
    setEditingGrid((prev) => {
      const next = cloneGrid(prev);
      next[dayIndex] = hours;
      return next;
    });
  };

  const hasChanges = useMemo(
    () => hashGrid(editingGrid) !== hashGrid(initialAvailability),
    [editingGrid, initialAvailability],
  );
  const repeatDirty = useMemo(
    () => JSON.stringify(patterns) !== JSON.stringify(initialRepeats ?? {}),
    [initialRepeats, patterns],
  );
  const updateEditor = (next: RepeatEditorValue) => {
    setEditor(next);
    if (selectedDays.length === 0) return;
    setPatterns((current) =>
      applyChoiceToDays(
        current,
        selectedDays,
        next.choice,
        (day) => availabilityAnchorDate(weekStart, day) ?? weekStart,
        {
          interval: Math.floor(Number(next.interval)) || 1,
          unit: next.unit,
          anchor: next.anchor,
        },
      ),
    );
  };
  const toggleRepeatDay = (day: number, checked: boolean) => {
    setSelectedDays((current) =>
      checked
        ? Array.from(new Set([...current, day]))
        : current.filter((item) => item !== day),
    );
    if (!checked) return;
    if (editor.choice === "none") {
      setEditor(editorForPattern(weekStart, day, patterns[day] ?? null));
      return;
    }
    setPatterns((current) =>
      applyChoiceToDays(
        current,
        [day],
        editor.choice,
        (index) => availabilityAnchorDate(weekStart, index) ?? weekStart,
        {
          interval: Math.floor(Number(editor.interval)) || 1,
          unit: editor.unit,
          anchor:
            editor.choice === "custom"
              ? editor.anchor
              : availabilityAnchorDate(weekStart, day) ?? weekStart,
        },
      ),
    );
  };

  const directSave = useMutation({
    mutationFn: async () => {
      if (!onSaveDirect || !sendAction) {
        throw new Error("Next availability window is not set");
      }
      await onSaveDirect(editingGrid, patterns, sendAction.windowStart);
    },
    onSuccess: () => {
      toast({
        title: "Availability sent",
        description: sendAction?.helper,
      });
    },
    onError: (error) => {
      logger.error("Error sending availability", { error, tags: ["error"] });
      toast({
        title: "Unable to send availability",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

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

  return (
    <Card className="border bg-background shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold">{t("schedule.availability")}</CardTitle>
            <CardDescription>
              {availabilityIsOpen
                ? "Open availability is any day and any time. The weekday grid is not required."
                : t("availability.dayStateLegend")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Week of {dayjs(weekStart).format("MMM D, YYYY")}</span>
          </div>
          {availabilityIsOpen ? (
            <div className="space-y-2 p-4" data-testid="availability-open-notice">
              <p className="text-sm font-medium">{t("availability.anyDayAnyTime")}</p>
              <p className="text-sm text-muted-foreground">{t("availability.thisCompanyUsesOpenAvailabilityYouDoNot")}</p>
            </div>
          ) : (
          <div className="space-y-2 p-3">
            <p
              className="text-sm text-muted-foreground"
              data-testid="availability-state-legend"
            >
              {t("availability.dayStateLegend")}
            </p>
            <div className="space-y-2" data-testid="availability-weekday-rows">
            {DAY_LABELS.map((label, dayIndex) => {
              const hours = editingGrid[dayIndex] ?? [];
              const state = dayAvailabilityState(hours);
              const range =
                state === "set_hours"
                  ? clockRangeFromHours(hours)
                  : { fromTime: "09:00", toTime: "17:00" };
              const disabled = !dayIsEditable(dayIndex);
              return (
                <div
                  key={label}
                  data-testid={`availability-day-${label.toLowerCase()}`}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center"
                >
                  <Checkbox
                    checked={selectedDays.includes(dayIndex)}
                    disabled={disabled}
                    data-testid={`availability-repeat-check-${label.toLowerCase()}`}
                    aria-label={`${label} repeat`}
                    onCheckedChange={(checked) =>
                      toggleRepeatDay(dayIndex, checked === true)
                    }
                  />
                  <span className="w-12 text-sm font-medium">{label}</span>
                  <span
                    className="text-xs text-muted-foreground"
                    data-testid={`availability-repeat-label-${label.toLowerCase()}`}
                  >
                    {t(repeatChoiceKey(choiceFromPattern(patterns[dayIndex] ?? null)))}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={state === "all_day" ? "default" : "outline"}
                      aria-pressed={state === "all_day"}
                      data-testid="availability-state-all-day"
                      disabled={disabled}
                      onClick={() =>
                        setDayHours(
                          dayIndex,
                          hoursForDayState("all_day", range.fromTime, range.toTime),
                        )
                      }
                    >{t("availability.availableAllDay")}</Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={state === "unavailable" ? "default" : "outline"}
                      aria-pressed={state === "unavailable"}
                      data-testid="availability-state-unavailable"
                      disabled={disabled}
                      onClick={() =>
                        setDayHours(
                          dayIndex,
                          hoursForDayState("unavailable", range.fromTime, range.toTime),
                        )
                      }
                    >{t("availability.unavailable")}</Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={state === "set_hours" ? "default" : "outline"}
                      aria-pressed={state === "set_hours"}
                      data-testid="availability-state-hours"
                      disabled={disabled}
                      onClick={() =>
                        setDayHours(
                          dayIndex,
                          hoursForDayState("set_hours", range.fromTime, range.toTime),
                        )
                      }
                    >{t("availability.availableAtSetHours")}</Button>
                  </div>
                  {state === "all_day" ? null : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Label
                        htmlFor={`availability-${label}-from`}
                        className="text-xs text-muted-foreground"
                      >{t("onboarding.from")}</Label>
                      <Input
                        id={`availability-${label}-from`}
                        aria-label={`${label} from`}
                        type="time"
                        className="h-8 w-32"
                        disabled={disabled}
                        value={range.fromTime}
                        onChange={(event) =>
                          setDayHours(
                            dayIndex,
                            hoursAfterTimeEdit(event.target.value, range.toTime),
                          )
                        }
                      />
                      <Label
                        htmlFor={`availability-${label}-to`}
                        className="text-xs text-muted-foreground"
                      >{t("onboarding.to")}</Label>
                      <Input
                        id={`availability-${label}-to`}
                        aria-label={`${label} to`}
                        type="time"
                        className="h-8 w-32"
                        disabled={disabled}
                        value={range.toTime}
                        onChange={(event) =>
                          setDayHours(
                            dayIndex,
                            hoursAfterTimeEdit(range.fromTime, event.target.value),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-warning" />
            {availabilityIsOpen
              ? "Open availability does not require the weekday grid."
              : sendAction
                ? t("availability.appliesFrom", { date: sendAction.windowStart })
                : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {availabilityIsOpen ? null : (
              <>
            <Button
              variant="outline"
              onClick={() => {
                setEditingGrid(cloneGrid(initialAvailability));
                setPatterns({ ...(initialRepeats ?? {}) });
                setSelectedDays([]);
                setEditor(editorForPattern(weekStart, 0, null));
              }}
              disabled={!hasChanges && !repeatDirty}
            >{t("forms.reset")}</Button>
            <RepeatPatternEditor
              value={editor}
              onChange={updateEditor}
            />
            <Button
              data-testid="availability-send"
              onClick={() => directSave.mutate()}
              disabled={!sendAction || directSave.isPending}
            >{t("availability.sendAvailability")}</Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default AvailabilityRequestForm;
