import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import ForecastAPI from '@/services/analytics/ForecastAPI';
import type { CopilotActionPayload } from '@/server/copilot/CopilotDTO';
import { computeExistingHours, generateDraftSchedulePlan } from '@/hooks/scheduling/copilotSchedulerPlan';
import type {
  CoverageGap,
  CoverageTemplatePlan,
  DraftShift,
  GeneratePlanOutput,
  SchedulerEmployee,
  ScheduleSummary,
  SwapSuggestion,
} from '@/hooks/scheduling/copilotSchedulerTypes';
import {
  buildCoverageGapActions,
  buildSwapActions,
  mapCoverageTemplateRow,
  mapEmployeeRow,
} from '@/hooks/scheduling/copilotSchedulerUtils';
import {
  INITIAL_STATE,
  type CopilotSchedulerState,
  type UseCopilotSchedulerOptions,
} from '@/hooks/scheduling/copilotSchedulerState';

export function useCopilotScheduler({
  weekStart,
  weekEnd,
  location,
  existingShifts = [],
  autoGenerate = true,
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
      const employeeQuery = supabase.from('employees').select('*').eq('company_id', companyId).order('role');
      const templateQuery = supabase
        .from('coverage_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('day_of_week')
        .order('start_time');

      if (location) {
        templateQuery.eq('location', location);
      }

      const [{ data: employeeRows, error: employeeError }, { data: templateRows, error: templateError }] =
        await Promise.all([employeeQuery, templateQuery]);

      if (employeeError) throw employeeError;
      if (templateError) throw templateError;

      const employees = (employeeRows ?? []).map(mapEmployeeRow);
      const templates = (templateRows ?? []).map(mapCoverageTemplateRow);

      const forecastMap = new Map(
        forecastApi
          .getCoverageForecast(templates, { window: timeframe, location })
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
      });

      const coverageGapActions = buildCoverageGapActions(companyId, actorUserId, timeframe, plan.coverageGaps);
      const swapActions = buildSwapActions(companyId, actorUserId, timeframe, plan.swapSuggestions);

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
        (error as PostgrestError)?.message ?? (error instanceof Error ? error.message : 'Failed to build schedule');
      setState((prev) => ({ ...prev, loading: false, error: message }));
      toast({
        title: 'Copilot scheduling failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [actorUserId, companyId, existingShifts, forecastApi, location, timeframe, toast, weekEnd, weekStart]);

  useEffect(() => {
    if (!autoGenerate || !companyId || !actorUserId) return;
    regenerate();
  }, [autoGenerate, actorUserId, companyId, regenerate]);

  const enqueueActions = useCallback(
    async (actions: CopilotActionPayload[], label: string) => {
      if (!companyId || !actorUserId) return { success: false };
      if (actions.length === 0) {
        toast({ title: `No ${label}`, description: 'There are no Copilot actions to queue.' });
        return { success: true };
      }

      const { error } = await supabase.functions.invoke('copilot-service', {
        body: {
          companyId,
          actorUserId,
          source: 'scheduler',
          timeframe,
          mode: 'enqueue',
          actions,
        },
      });

      if (error) {
        toast({
          title: `Failed to queue ${label}`,
          description: error.message ?? 'Unknown error while invoking Copilot service.',
          variant: 'destructive',
        });
        return { success: false, error };
      }

      toast({
        title: `Queued ${label}`,
        description: `${actions.length} action${actions.length === 1 ? '' : 's'} sent to Copilot dispatcher.`,
      });
      return { success: true };
    },
    [actorUserId, companyId, timeframe, toast],
  );

  const enqueueCoverageGaps = useCallback(() => enqueueActions(state.coverageGapActions, 'coverage gaps'), [
    enqueueActions,
    state.coverageGapActions,
  ]);

  const enqueueSwapSuggestions = useCallback(() => enqueueActions(state.swapActions, 'swap suggestions'), [
    enqueueActions,
    state.swapActions,
  ]);

  const publishDraftSchedule = useCallback(async () => {
    if (!companyId || !actorUserId) return;
    if (state.draftShifts.length === 0) {
      toast({ title: 'No draft shifts', description: 'Generate a draft schedule before publishing.' });
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
      status: 'draft',
      is_published: false,
      company_id: companyId,
      created_by: actorUserId,
      notes: shift.employeeName ? `Drafted for ${shift.employeeName}` : 'Open shift',
      requirements: {
        copilot: {
          runId: state.lastGeneratedAt ?? `manual-${timestamp}`,
          generatedAt: state.lastGeneratedAt ?? timestamp,
          locationId: shift.location,
          slotId: shift.dedupeKey,
          slotRole: shift.role,
          weekStart: weekStart.toISOString(),
          status: 'draft',
        },
      },
    }));

    const { data: inserted, error } = await supabase
      .from('schedules')
      .insert(schedulePayloads)
      .select('id');

    if (error) {
      toast({
        title: 'Publish failed',
        description: error.message ?? 'Unable to persist draft schedule.',
        variant: 'destructive',
      });
      return;
    }

    const assignmentRows =
      inserted?.flatMap((row, index) => {
        const shift = state.draftShifts[index];
        if (!row?.id || !shift?.employeeId) return [];
        return [
          {
            schedule_id: row.id,
            user_id: shift.employeeId,
            status: 'draft',
            assigned_by: actorUserId,
            assigned_at: timestamp,
          },
        ];
      }) ?? [];

    if (assignmentRows.length > 0) {
      const { error: assignmentError } = await supabase.from('schedule_assignments').insert(assignmentRows);
      if (assignmentError) {
        toast({
          title: 'Publish warning',
          description: assignmentError.message ?? 'Shifts saved but assignments failed.',
          variant: 'destructive',
        });
      }
    }

    toast({
      title: 'Draft schedule saved',
      description: 'All Copilot-generated shifts have been stored as draft entries.',
    });

    if (typeof onPublished === 'function') {
      await onPublished();
    }
  }, [actorUserId, companyId, onPublished, state.draftShifts, state.lastGeneratedAt, toast, weekStart]);

  return {
    ...state,
    regenerate,
    enqueueCoverageGaps,
    enqueueSwapSuggestions,
    publishDraftSchedule,
  };
}

export type UseCopilotSchedulerReturn = ReturnType<typeof useCopilotScheduler>;
export type { UseCopilotSchedulerOptions } from '@/hooks/scheduling/copilotSchedulerState';
