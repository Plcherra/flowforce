import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canViewScheduleDrafts } from "@/utils/authRoles";
import { buildSchedulingFallbackData } from "./fallbackData";
import { logger } from "@/utils/logger";
import { isMissingBackendResourceError } from "@/shared/utils/supabaseErrors";
import type {
  AssignmentWithUser,
  SchedulingQueryParams,
  ShiftUpsertInput,
  ShiftWithAssignments,
  TimeOffWithUser,
  UnavailabilityWithUser,
  VendorEventUpsertInput,
  VendorEventRow,
  ProfileSummary,
} from "./types";
import {
  fetchSchedulingWeek,
  buildSchedulesWeekQueryKey,
  assignUserToShift,
  unassignUserFromShift,
  upsertShiftRecord,
  upsertVendorEvent as upsertVendorEventRecord,
} from "@/features/scheduling/repositories/schedulingRepository";
import type { Tables } from "@/integrations/supabase/public-types";

interface SchedulingConsolidatedResult {
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOffRequests: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  vendorEvents: VendorEventRow[];
  teamMembers: ProfileSummary[];
  loading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
  assign: (
    shiftId: string,
    userId: string,
    status?: string,
  ) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  upsertShift: (
    payload: ShiftUpsertInput,
  ) => Promise<Tables<"schedules"> | null>;
  upsertVendorEvent: (
    payload: VendorEventUpsertInput,
  ) => Promise<VendorEventRow | null>;
  isUsingFallbackData: boolean;
}

const DEFAULT_ERROR = "Unable to load the latest scheduling data.";
const SCHEDULING_RESOURCE_NAMES = [
  "schedules",
  "schedule_assignments",
  "time_off_requests",
  "user_unavailability",
  "vendor_event",
  "vendor_visits",
];

export function useSchedulingConsolidated(
  params: SchedulingQueryParams,
): SchedulingConsolidatedResult {
  const { companyId, start, end, enabled = true } = params;
  const { toast } = useToast();
  const { user } = useAuth();

  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithUser[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffWithUser[]>([]);
  const [unavailability, setUnavailability] = useState<
    UnavailabilityWithUser[]
  >([]);
  const [vendorEvents, setVendorEvents] = useState<VendorEventRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<ProfileSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);
  const fallbackNoticeShownRef = useRef<boolean>(false);
  const queryClient = useQueryClient();

  const range = useMemo(() => {
    const parseDate = (value?: Date | string | null) => {
      if (!value) return undefined;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : date;
    };

    const startDate = parseDate(start);
    const endDate = parseDate(end);

    const toIsoDate = (date?: Date) =>
      date ? date.toISOString().split("T")[0] : undefined;

    return {
      start: startDate ? startDate.toISOString() : undefined,
      end: endDate ? endDate.toISOString() : undefined,
      startDateOnly: toIsoDate(startDate),
      endDateOnly: toIsoDate(endDate),
    };
  }, [start, end]);

  const ensureCompanyContext = useCallback(() => {
    if (!companyId) {
      throw new Error(
        "A company context is required for scheduling operations.",
      );
    }
  }, [companyId]);

  const includeDrafts = canViewScheduleDrafts(user);
  const schedulesQueryKey =
    companyId && range.start && range.end
      ? buildSchedulesWeekQueryKey({
          companyId,
          startIso: range.start,
          endIso: range.end,
          includeDrafts,
        })
      : null;

  const schedulesQuery = useQuery({
    queryKey: schedulesQueryKey ?? ["schedules-week", "disabled"],
    enabled: Boolean(enabled && companyId && range.start && range.end),
    staleTime: 60_000,
    queryFn: () =>
      fetchSchedulingWeek({
        companyId: companyId!,
        startIso: range.start!,
        endIso: range.end!,
        includeDrafts,
      }),
  });

  useEffect(() => {
    if (schedulesQuery.data) {
      const payload = schedulesQuery.data;
      setShifts(payload.shifts);
      setAssignments(payload.assignments);
      setTimeOffRequests(payload.timeOff);
      setUnavailability(payload.unavailability);
      setVendorEvents(payload.vendorEvents);
      setTeamMembers(payload.teamMembers);
      setIsUsingFallback(false);
      fallbackNoticeShownRef.current = false;
      setError(null);
    }
  }, [schedulesQuery.data]);

  useEffect(() => {
    if (!schedulesQuery.error || !range.start) {
      return;
    }
    const errorMessage =
      schedulesQuery.error instanceof Error
        ? schedulesQuery.error.message
        : typeof schedulesQuery.error === "object" &&
            schedulesQuery.error !== null &&
            "message" in schedulesQuery.error
          ? String((schedulesQuery.error as { message?: unknown }).message)
          : DEFAULT_ERROR;
    const missingSchema = isMissingBackendResourceError(
      schedulesQuery.error,
      SCHEDULING_RESOURCE_NAMES,
    );
    const logContext = {
      error: schedulesQuery.error,
      context: { errorMessage },
      tags: [missingSchema ? "warning" : "error"],
    };

    if (missingSchema) {
      logger.warn("Scheduling database resources are missing", logContext);
    } else {
      logger.error("Failed to load scheduling data, using fallback data", {
        ...logContext,
        tags: ["error"],
      });
    }

    setError(errorMessage);
    const fallback = buildSchedulingFallbackData({ start: range.start });
    setShifts(fallback.shifts);
    setAssignments(fallback.assignments);
    setTimeOffRequests(fallback.timeOff);
    setUnavailability(fallback.unavailability);
    setVendorEvents(fallback.vendorEvents);
    setTeamMembers(fallback.profiles);
    setIsUsingFallback(true);

    if (!missingSchema && !fallbackNoticeShownRef.current) {
      toast({
        title: "Scheduling in preview mode",
        description:
          "Live scheduling data is unavailable. Showing demo data so you can continue exploring the schedule experience.",
      });
      fallbackNoticeShownRef.current = true;
    }
  }, [range.start, schedulesQuery.error, toast]);

  const refetchAll = useCallback(async () => {
    if (!schedulesQueryKey) return;
    await queryClient.invalidateQueries({ queryKey: schedulesQueryKey });
  }, [queryClient, schedulesQueryKey]);

  const assign = useCallback(
    async (shiftId: string, userId: string, status: string = "assigned") => {
      try {
        ensureCompanyContext();

        await assignUserToShift(shiftId, userId, status, user?.id ?? null);
        await refetchAll();
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to assign teammate to shift.";
        toast({
          title: "Assignment error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [ensureCompanyContext, refetchAll, toast, user?.id],
  );

  const unassign = useCallback(
    async (shiftId: string, userId: string) => {
      try {
        ensureCompanyContext();

        await unassignUserFromShift(shiftId, userId);
        await refetchAll();
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to unassign teammate from shift.";
        toast({
          title: "Unassignment error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [ensureCompanyContext, refetchAll, toast],
  );

  const upsertShift = useCallback(
    async (payload: ShiftUpsertInput) => {
      try {
        ensureCompanyContext();

        if (!payload.start_time || !payload.end_time) {
          throw new Error(
            "Shift title, start_time, and end_time are required.",
          );
        }

        const record = await upsertShiftRecord({
          ...payload,
          company_id: payload.company_id ?? companyId ?? null,
          created_by: payload.created_by ?? user?.id ?? null,
        });
        await refetchAll();
        return record;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to save shift.";
        toast({
          title: "Shift save error",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [companyId, ensureCompanyContext, refetchAll, toast, user?.id],
  );

  const upsertVendorEvent = useCallback(
    async (payload: VendorEventUpsertInput) => {
      try {
        ensureCompanyContext();

        const event = await upsertVendorEventRecord({
          ...payload,
          company_id: companyId!,
        });
        await refetchAll();
        return event;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to save vendor event.";
        toast({
          title: "Vendor event error",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [companyId, ensureCompanyContext, refetchAll, toast],
  );

  const loading = schedulesQuery.isLoading && !isUsingFallback;

  return {
    shifts,
    assignments,
    timeOffRequests,
    unavailability,
    vendorEvents,
    teamMembers,
    loading,
    error,
    refetchAll,
    assign,
    unassign,
    upsertShift,
    upsertVendorEvent,
    isUsingFallbackData: isUsingFallback,
  };
}

export type {
  ShiftWithAssignments,
  AssignmentWithUser,
  TimeOffWithUser,
  UnavailabilityWithUser,
  VendorEventRow as VendorEventWithMetadata,
  ProfileSummary,
  ShiftUpsertInput,
  VendorEventUpsertInput,
  SchedulingQueryParams,
} from "./types";
