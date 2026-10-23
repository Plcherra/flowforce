/**
 * Types for scheduling mutations
 */

import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/public-types";
import type {
  VendorEventUpsertInput,
  VendorEventWithMetadata,
} from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type {
  TimeOffPolicy,
  TimeOffUsage,
} from "@/features/scheduling/utils/timeOffPolicy";

export type ShiftInsertPayload = Omit<
  TablesInsert<"schedules">,
  "company_id" | "created_by"
>;

export type SchedulingMutationOptions = {
  refresh?: boolean;
  silent?: boolean;
};

/** `"warning"` means the assignment was saved and a warning toast was already shown. */
export type AssignOutcome = boolean | "warning";

export interface SchedulingMutations {
  createSchedule: (
    payload: ShiftInsertPayload,
  ) => Promise<Tables<"schedules"> | null>;
  updateSchedule: (
    id: string,
    updates: TablesUpdate<"schedules">,
    options?: SchedulingMutationOptions,
  ) => Promise<Tables<"schedules"> | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
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
  createVendorEvent: (
    payload: VendorEventUpsertInput,
  ) => Promise<VendorEventWithMetadata | null>;
  deleteVendorEvent: (id: string) => Promise<boolean>;
  clearWeek: (params: {
    weekStart: string;
    weekEnd: string;
  }) => Promise<boolean>;
  addUnavailability: (payload: {
    userId: string;
    start: string;
    end: string;
    reason?: string | null;
    repeat?: import("@/features/scheduling/utils/repeatPattern").RepeatPattern | null;
  }) => Promise<boolean>;
  requestTimeOff: (payload: {
    userId: string;
    startDate: string;
    endDate: string;
    type: "vacation" | "sick" | "personal" | "other";
    reason?: string | null;
    policyId?: string | null;
    policies?: TimeOffPolicy[];
    usage?: TimeOffUsage[];
    roleId?: string | null;
    asOf?: string;
  }) => Promise<boolean>;
  bulkCreateShifts: (payloads: ShiftInsertPayload[]) => Promise<boolean>;
  copyWeek: (params: {
    sourceWeekStart: string;
    targetWeekStart: string;
  }) => Promise<boolean>;
  publishWeek: (params: {
    weekStart: string;
    weekEnd: string;
    isPublished: boolean;
    blockingConflictCount?: number;
  }) => Promise<boolean>;
  approveTimeOff: (requestId: string, notes?: string) => Promise<boolean>;
  upsertVendorEvent: (
    payload: VendorEventUpsertInput,
  ) => Promise<VendorEventWithMetadata | null>;
}
