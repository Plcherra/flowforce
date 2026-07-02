import { useCallback, useEffect, useMemo, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import ForecastAPI from "@/services/analytics/ForecastAPI";
import type { CopilotActionPayload } from "@/server/copilot/CopilotDTO";
import {
  computeExistingHours,
  generateDraftSchedulePlan,
} from "@/features/scheduling/hooks/copilotSchedulerPlan";
import type {
  CoverageGap,
  CoverageTemplatePlan,
  DraftShift,
  GeneratePlanOutput,
  SchedulerEmployee,
  ScheduleSummary,
  SwapSuggestion,
} from "@/features/scheduling/hooks/copilotSchedulerTypes";
import {
  buildCoverageGapActions,
  buildSwapActions,
  mapCoverageTemplateRow,
  mapEmployeeRow,
} from "@/features/scheduling/hooks/copilotSchedulerUtils";
import {
  INITIAL_STATE,
  type CopilotSchedulerState,
  type UseCopilotSchedulerOptions,
} from "@/features/scheduling/hooks/copilotSchedulerState";
import {
  listCompanyEmployees,
  listCoverageTemplates,
} from "@/features/scheduling/repositories/copilotRepository";
import {
  insertSchedules,
  assignUserToShift,
  fetchStaffAvailabilityForWeek,
} from "@/features/scheduling/repositories/schedulingRepository";
import { supabase } from "@/integrations/supabase/client";

export function useCopilotScheduler({
  weekStart,
  weekEnd,
  location,
  existingShifts = [],
  staffAvailability: staffAvailabilityInput,
  timeOff: timeOffInput,
  unavailability: unavailabilityInput,
  autoGenerate = false,
  onPublished,
}: UseCopilotSchedulerOptions) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [state, setState] = useState<CopilotSchedulerState>(INITIAL_STATE);
  const forecastApi = useMemo(() => new ForecastAPI(), []);

  const companyId = profile?.companyId ?? null;
  const actorUserId = profile?.id ?? null;

  const timeframe = useMemo(
    () => ({ start: weekStart.toISOString(), end: weekEnd.toISOString() }),
    [weekEnd, weekStart],
  );

  const regenerate = useCallback(async () => {
    if (!companyId || !actorUserId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [employeeRows, templateRows] = await Promise.all([
        listCompanyEmployees(companyId),
        listCoverageTemplates(companyId, location ?? undefined),
      ]);

      const employees = employeeRows.map(mapEmployeeRow);
      const memberIds = employees.map((employee) => employee.profileId);
      const weekStartIso = weekStart.toISOString();
      const weekEndIso = weekEnd.toISOString();

      let staffAvailability = staffAvailabilityInput ?? [];
      let timeOff = timeOffInput ?? [];
      let unavailability = unavailabilityInput ?? [];

      if (!staffAvailabilityInput && memberIds.length > 0) {
        staffAvailability = await fetchStaffAvailabilityForWeek({
          memberIds,
          startIso: weekStartIso,
          endIso: weekEndIso,
        });
      }

      if (!timeOffInput && memberIds.length > 0) {
        const { data: timeOffRows, error: timeOffError } = await supabase
          .from("time_off_requests")
          .select("*")
          .in("user_id", memberIds)
          .lte("start_date", weekEndIso.split("T")[0])
          .gte("end_date", weekStartIso.split("T")[0]);
        if (timeOffError) throw timeOffError;
        timeOff = (timeOffRows ?? []) as typeof timeOff;
      }

      if (!unavailabilityInput && memberIds.length > 0) {
        const { data: unavailabilityRows, error: unavailabilityError } =
          await supabase
            .from("user_unavailability")
            .select("*")
            .in("user_id", memberIds)
            .lte("start_time", weekEndIso)
            .or(`end_time.gte.${weekStartIso},end_time.is.null`);
        if (unavailabilityError) throw unavailabilityError;
        unavailability = (unavailabilityRows ?? []) as typeof unavailability;
      }

      const templates = templateRows
        .sort((a, b) => {
          if (a.day_of_week !== b.day_of_week)
            return a.day_of_week - b.day_of_week;
          return a.start_time.localeCompare(b.start_time);
        })
        .map(mapCoverageTemplateRow);

      const forecastMap = new Map(
        forecastApi
          .getCoverageForecast(templates as any, { window: timeframe, location })
          .map((forecast) => [forecast.templateId, forecast]),
      );

      const existing = computeExistingHours(existingShifts);
      const plan: GeneratePlanOutput = generateDraftSchedulePlan({
        employees,
        templates,
        weekStart,
        weekEnd,
        forecastMap,
        existingHours: existing.totals,
        existingHoursByStore: existing.perStore,
        staffAvailability,
        timeOff,
        unavailability,
      });

      const coverageGapActions = buildCoverageGapActions(
        companyId,
        actorUserId,
        timeframe,
        plan.coverageGaps,
      );
      const swapActions = buildSwapActions(
        companyId,
        actorUserId,
        timeframe,
        plan.swapSuggestions,
      );

      setState({
        loading: false,
        error: null,
        employees,
        templates,
        draftShifts: plan.draftShifts,
        coverageGaps: plan.coverageGaps,
        swapSuggestions: plan.swapSuggestions,
        summary: plan.summary,
        coverageGapActions,
        swapActions,
        lastGeneratedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        (error as PostgrestError)?.message ??
        (error instanceof Error ? error.message : "Failed to build schedule");
      setState((prev) => ({ ...prev, loading: false, error: message }));
      toast({
        title: "Smart Fill failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [
    actorUserId,
    companyId,
    existingShifts,
    forecastApi,
    location,
    timeframe,
    toast,
    weekEnd,
    weekStart,
    staffAvailabilityInput,
    timeOffInput,
    unavailabilityInput,
  ]);

  useEffect(() => {
    if (!autoGenerate || !companyId || !actorUserId) return;
    regenerate();
  }, [autoGenerate, actorUserId, companyId, regenerate]);

  const enqueueActions = useCallback(
    async (actions: CopilotActionPayload[], label: string) => {
      if (!companyId || !actorUserId) return { success: false };
      if (actions.length === 0) {
        toast({
          title: `No ${label}`,
          description: "There are no actions to queue.",
        });
        return { success: true };
      }

      const { error } = await supabase.functions.invoke("copilot-service", {
        body: {
          companyId,
          actorUserId,
          source: "scheduler",
          timeframe,
          mode: "enqueue",
          actions,
        },
      });

      if (error) {
        toast({
          title: `Failed to queue ${label}`,
          description:
            error.message ?? "Unknown error while queueing actions.",
          variant: "destructive",
        });
        return { success: false, error };
      }

      toast({
        title: `Queued ${label}`,
        description: `${actions.length} action${actions.length === 1 ? "" : "s"} queued.`,
      });
      return { success: true };
    },
    [actorUserId, companyId, timeframe, toast],
  );

  const enqueueCoverageGaps = useCallback(
    () => enqueueActions(state.coverageGapActions, "coverage gaps"),
    [enqueueActions, state.coverageGapActions],
  );

  const enqueueSwapSuggestions = useCallback(
    () => enqueueActions(state.swapActions, "swap suggestions"),
    [enqueueActions, state.swapActions],
  );

  const publishDraftSchedule = useCallback(async () => {
    if (!companyId || !actorUserId) return;
    if (state.draftShifts.length === 0) {
      toast({
        title: "No draft shifts",
        description: "Generate a draft schedule before publishing.",
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const schedulePayloads = state.draftShifts.map((shift) => ({
      title: shift.role,
      start_time: shift.start,
      end_time: shift.end,
      location: shift.location,
      role: shift.role,
      required_headcount: 1,
      status: "draft",
      is_published: false,
      company_id: companyId,
      created_by: actorUserId,
      notes: shift.employeeName
        ? `Drafted for ${shift.employeeName}`
        : "Open shift",
      requirements: {
        copilot: {
          runId: state.lastGeneratedAt ?? `manual-${timestamp}`,
          generatedAt: state.lastGeneratedAt ?? timestamp,
          locationId: shift.location,
          slotId: shift.dedupeKey,
          slotRole: shift.role,
          weekStart: weekStart.toISOString(),
          status: "draft",
        },
      },
    }));

    const inserted = await insertSchedules(schedulePayloads);

    const assignmentRows =
      inserted?.flatMap((row, index) => {
        const shift = state.draftShifts[index];
        if (!row?.id || !shift?.employeeId) return [];
        return [
          {
            schedule_id: row.id,
            user_id: shift.employeeId,
            status: "draft",
            assigned_by: actorUserId,
            assigned_at: timestamp,
          },
        ];
      }) ?? [];

    if (assignmentRows.length > 0) {
      for (const row of assignmentRows) {
        if (!row.schedule_id || !row.user_id) continue;
        await assignUserToShift(
          row.schedule_id,
          row.user_id,
          row.status ?? "draft",
          row.assigned_by ?? actorUserId,
        );
      }
    }

    toast({
      title: "Draft shifts added",
      description:
        "Suggested shifts were saved as drafts on the schedule board.",
    });

    if (typeof onPublished === "function") {
      await onPublished();
    }
  }, [
    actorUserId,
    companyId,
    onPublished,
    state.draftShifts,
    state.lastGeneratedAt,
    toast,
    weekStart,
  ]);

  return {
    ...state,
    regenerate,
    enqueueCoverageGaps,
    enqueueSwapSuggestions,
    publishDraftSchedule,
  };
}

export type UseCopilotSchedulerReturn = ReturnType<typeof useCopilotScheduler>;
export type { UseCopilotSchedulerOptions } from "@/features/scheduling/hooks/copilotSchedulerState";
