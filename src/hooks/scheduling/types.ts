import type { Tables } from "@/integrations/supabase/public-types";

export type ScheduleRow = Tables<"schedules">;
export type ScheduleAssignmentRow = Tables<"schedule_assignments">;
export type TimeOffRequestRow = Tables<"time_off_requests">;
export type UnavailabilityRow = Tables<"user_unavailability">;
export type VendorEventRow = Tables<"vendor_event">;
export type ProfileRow = Tables<"profiles">;

export type ProfileSummary = Pick<
  ProfileRow,
  "id" | "first_name" | "last_name" | "email" | "avatar_url"
>;

export interface SchedulingQueryParams {
  companyId?: string | null;
  start?: Date | string | null;
  end?: Date | string | null;
  enabled?: boolean;
}

export interface AssignmentWithUser extends ScheduleAssignmentRow {
  user?: ProfileSummary | null;
}

export interface ShiftWithAssignments extends ScheduleRow {
  assignments: AssignmentWithUser[];
  job_position?: {
    id?: string;
    name?: string | null;
    role?: string | null;
  } | null;
}

export interface TimeOffWithUser extends TimeOffRequestRow {
  user?: ProfileSummary | null;
}

export interface UnavailabilityWithUser extends UnavailabilityRow {
  user?: ProfileSummary | null;
  createdBy?: ProfileSummary | null;
}

export interface ShiftUpsertInput extends Partial<ScheduleRow> {
  id?: string;
}

export interface VendorEventUpsertInput extends Partial<VendorEventRow> {
  id?: string;
  company_id?: string;
  vendor_type: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location_id?: string | null;
  shift_id?: string | null;
  notes?: string | null;
}
