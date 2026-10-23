import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { scheduleShiftTextTranslation } from "@/features/scheduling/scheduleShiftText";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { canViewScheduleDrafts } from "@/utils/authRoles";
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
  VendorEventWithMetadata,
  ProfileSummary,
} from "./types";
import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";
import {
  fetchSchedulingWeek,
  buildSchedulesWeekQueryKey,
  assignUserToShift,
  unassignUserFromShift,
  upsertShiftRecord,
  upsertVendorEvent as upsertVendorEventRecord,
} from "@/features/scheduling/repositories/schedulingRepository";
import type { Tables } from "@/integrations/supabase/public-types";
import type {
  AssignOutcome,
  SchedulingMutationOptions,
} from "@/features/scheduling/types/mutations";

interface SchedulingConsolidatedResult {
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOffRequests: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  staffAvailability: StaffAvailabilityRow[];
  vendorEvents: VendorEventWithMetadata[];
  teamMembers: ProfileSummary[];
  loading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
  assign: (
    shiftId: string,
    userId: string,
    status?: string,
    options?: SchedulingMutationOptions,
  ) => Promise<AssignOutcome>;
  unassign: (
    shiftId: string,
    userId: string,
    options?: SchedulingMutationOptions,
  ) => Promise<boolean>;
  upsertShift: (
    payload: ShiftUpsertInput,
    options?: SchedulingMutationOptions,
  ) => Promise<Tables<"schedules"> | null>;
  upsertVendorEvent: (
    payload: VendorEventUpsertInput,
  ) => Promise<VendorEventWithMetadata | null>;
  isUsingFallbackData: boolean;
}

const DEFAULT_ERROR = "Unable to load the latest scheduling data.";
const SCHEDULING_RESOURCE_NAMES = [
  "schedules",
  "schedule_assignments",
  "time_off_requests",
  "user_unavailability",
  "staff_availability",
  "vendor_event",
  "vendor_visits",
];

export function useSchedulingConsolidated(
  params: SchedulingQueryParams,
): SchedulingConsolidatedResult {
  const { companyId, start, end, enabled = true } = params;
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { i18n } = useTranslation();
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);

  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithUser[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffWithUser[]>([]);
  const [unavailability, setUnavailability] = useState<
    UnavailabilityWithUser[]
  >([]);
  const [staffAvailability, setStaffAvailability] = useState<
    StaffAvailabilityRow[]
  >([]);
  const [vendorEvents, setVendorEvents] = useState<VendorEventWithMetadata[]>([]);
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

  const includeDrafts = canViewScheduleDrafts(user, profile?.role);
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
      setStaffAvailability(payload.staffAvailability);
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
      logger.error("Failed to load scheduling data", {
        ...logContext,
        tags: ["error"],
      });
    }

    setError(errorMessage);
    setIsUsingFallback(false);
    if (!schedulesQuery.data) {
      setShifts([]);
      setAssignments([]);
      setTimeOffRequests([]);
      setUnavailability([]);
      setStaffAvailability([]);
      setVendorEvents([]);
      setTeamMembers([]);
    }

    if (!fallbackNoticeShownRef.current) {
      toast({
        title: "Couldn't load the schedule",
        description: missingSchema
          ? "Scheduling data is missing for this workspace. Demo shifts were not added."
          : errorMessage || DEFAULT_ERROR,
        variant: "destructive",
      });
      fallbackNoticeShownRef.current = true;
    }
  }, [range.start, schedulesQuery.data, schedulesQuery.error, toast]);

  const refetchAll = useCallback(async () => {
    if (!schedulesQueryKey) return;
    await queryClient.invalidateQueries({ queryKey: schedulesQueryKey });
  }, [queryClient, schedulesQueryKey]);

  const assign = useCallback(
    async (
      shiftId: string,
      userId: string,
      status: string = "assigned",
      options?: SchedulingMutationOptions,
    ) => {
      try {
        ensureCompanyContext();

        const result = await assignUserToShift(
          shiftId,
          userId,
          status,
          user?.id ?? null,
        );
        if (options?.refresh !== false) {
          await refetchAll();
        } else {
          setShifts((current) =>
            current.map((shift) => {
              if (shift.id !== shiftId) return shift;
              if (shift.assignments?.some((row) => row.user_id === userId)) {
                return shift;
              }
              return {
                ...shift,
                assignments: [
                  ...(shift.assignments ?? []),
                  {
                    schedule_id: shiftId,
                    user_id: userId,
                    status,
                  } as AssignmentWithUser,
                ],
              };
            }),
          );
        }
        if (
          !options?.silent &&
          result.severity === "warning" &&
          result.reasons?.length
        ) {
          toast({
            title: "Assigned with warning",
            description: result.reasons.join(" "),
          });
          return "warning";
        }
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
    async (
      shiftId: string,
      userId: string,
      options?: SchedulingMutationOptions,
    ) => {
      try {
        ensureCompanyContext();

        await unassignUserFromShift(shiftId, userId);
        if (options?.refresh !== false) {
          await refetchAll();
        } else {
          setShifts((current) =>
            current.map((shift) =>
              shift.id === shiftId
                ? {
                    ...shift,
                    assignments: (shift.assignments ?? []).filter(
                      (row) => row.user_id !== userId,
                    ),
                  }
                : shift,
            ),
          );
        }
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
    async (payload: ShiftUpsertInput, options?: SchedulingMutationOptions) => {
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
        if (
          record?.id &&
          companyId &&
          (payload.title !== undefined || payload.notes !== undefined)
        ) {
          scheduleShiftTextTranslation({
            companyId,
            sourceId: record.id,
            sourceLocale,
            title: typeof payload.title === "string" ? payload.title : null,
            notes: typeof payload.notes === "string" ? payload.notes : null,
          });
        }
        if (options?.refresh !== false) {
          await refetchAll();
        } else if (record && payload.id) {
          setShifts((current) =>
            current.map((shift) =>
              shift.id === payload.id
                ? {
                    ...shift,
                    ...(payload.start_time
                      ? { start_time: payload.start_time }
                      : {}),
                    ...(payload.end_time ? { end_time: payload.end_time } : {}),
                  }
                : shift,
            ),
          );
        }
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
    [companyId, ensureCompanyContext, refetchAll, sourceLocale, toast, user?.id],
  );

  const upsertVendorEvent = useCallback(
    async (payload: VendorEventUpsertInput) => {
      try {
        ensureCompanyContext();

        const event = await upsertVendorEventRecord(
          {
            ...payload,
            company_id: companyId!,
          },
          sourceLocale,
        );
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
    [companyId, ensureCompanyContext, refetchAll, sourceLocale, toast],
  );

  const loading = schedulesQuery.isLoading && !isUsingFallback;

  return {
    shifts,
    assignments,
    timeOffRequests,
    unavailability,
    staffAvailability,
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
  VendorEventWithMetadata,
  ProfileSummary,
  ShiftUpsertInput,
  VendorEventUpsertInput,
  SchedulingQueryParams,
} from "./types";
