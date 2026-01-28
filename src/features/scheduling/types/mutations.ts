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
} from "@/hooks/scheduling/useSchedulingConsolidated";

export type ShiftInsertPayload = Omit<
  TablesInsert<"schedules">,
  "company_id" | "created_by"
>;

export interface SchedulingMutations {
  createSchedule: (
    payload: ShiftInsertPayload,
  ) => Promise<Tables<"schedules"> | null>;
  updateSchedule: (
    id: string,
    updates: TablesUpdate<"schedules">,
  ) => Promise<Tables<"schedules"> | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  assign: (
    shiftId: string,
    userId: string,
    status?: string,
  ) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  createVendorEvent: (
    payload: VendorEventUpsertInput,
  ) => Promise<VendorEventWithMetadata | null>;
  deleteVendorEvent: (id: string) => Promise<boolean>;
  autoGenerateWeek: (params: {
    weekStart: string;
    preferences?: Record<string, unknown>;
  }) => Promise<boolean>;
  clearWeek: (params: {
    weekStart: string;
    weekEnd: string;
  }) => Promise<boolean>;
  addUnavailability: (payload: {
    userId: string;
    start: string;
    end: string;
    reason?: string | null;
  }) => Promise<boolean>;
  requestTimeOff: (payload: {
    userId: string;
    startDate: string;
    endDate: string;
    type: "vacation" | "sick" | "personal" | "other";
    reason?: string | null;
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
  }) => Promise<boolean>;
  generateRecommendations: (scheduleId: string) => Promise<AIRecommendation[]>;
  approveTimeOff: (requestId: string, notes?: string) => Promise<boolean>;
  upsertVendorEvent: (
    payload: VendorEventUpsertInput,
  ) => Promise<VendorEventWithMetadata | null>;
}

export interface AIRecommendation {
  name: string;
  score: number;
  reasons?: string[];
}
