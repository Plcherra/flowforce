import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';
import type {
  AssignmentWithUser,
  ProfileSummary,
  ShiftUpsertInput,
  ShiftWithAssignments,
  TimeOffWithUser,
  UnavailabilityWithUser,
  VendorEventUpsertInput,
  VendorEventRow,
} from '@/hooks/scheduling/types';

const jsonSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(jsonSchema), z.array(jsonSchema)]),
);

const profileSchema = z
  .object({
    id: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    email: z.string().nullable(),
    avatar_url: z.string().nullable(),
    company_id: z.string().nullable(),
  })
  .passthrough();

const scheduleRowSchema = z
  .object({
    id: z.string(),
    company_id: z.string().nullable(),
    title: z.string().nullable(),
    role: z.string().nullable(),
    start_time: z.string(),
    end_time: z.string(),
    location: z.string().nullable(),
    required_headcount: z.number().nullable(),
    break_minutes: z.number().nullable(),
    color: z.string().nullable(),
    timezone: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    created_by: z.string().nullable(),
    updated_at: z.string().nullable(),
    is_all_day: z.boolean().nullable(),
    is_published: z.boolean().nullable(),
    is_template: z.boolean().nullable(),
    position_id: z.string().nullable(),
    template_id: z.string().nullable(),
    status: z.string().nullable(),
    requirements: jsonSchema.nullable(),
    hourly_rate: z.number().nullable(),
    user_id: z.string().nullable(),
  })
  .passthrough();

const assignmentRowSchema = z
  .object({
    id: z.string(),
    schedule_id: z.string(),
    user_id: z.string().nullable(),
    status: z.string().nullable(),
    assigned_at: z.string().nullable(),
    assigned_by: z.string().nullable(),
    confirmed_at: z.string().nullable(),
  })
  .passthrough();

const timeOffRowSchema = z
  .object({
    id: z.string(),
    user_id: z.string().nullable(),
    start_date: z.string(),
    end_date: z.string(),
    type: z.string(),
    status: z.string().nullable(),
    reason: z.string().nullable(),
    notes: z.string().nullable(),
    approved_at: z.string().nullable(),
    approved_by: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

const unavailabilityRowSchema = z
  .object({
    id: z.string(),
    user_id: z.string().nullable(),
    created_by: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    reason: z.string().nullable(),
    is_recurring: z.boolean().nullable(),
    recurring_pattern: jsonSchema.nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

const vendorEventRowSchema = z
  .object({
    id: z.string(),
    company_id: z.string().nullable(),
    location_id: z.string().nullable(),
    vendor_type: z.string(),
    event_date: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    shift_id: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
  })
  .passthrough();

export interface SchedulingWeekResult {
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  vendorEvents: VendorEventRow[];
  teamMembers: ProfileSummary[];
}

export function buildSchedulesWeekQueryKey(params: {
  companyId: string;
  startIso: string;
  endIso: string;
  includeDrafts: boolean;
}) {
  return ['schedules-week', params.companyId, params.startIso, params.endIso, params.includeDrafts] as const;
}

export async function fetchSchedulingWeek(params: {
  companyId: string;
  startIso: string;
  endIso: string;
  includeDrafts: boolean;
}): Promise<SchedulingWeekResult> {
  const { companyId, startIso, endIso, includeDrafts } = params;

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, company_id')
    .eq('company_id', companyId);
  if (profileError) throw profileError;
  const profiles = z.array(profileSchema).parse(profileRows ?? []);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const memberIds = profiles.map((profile) => profile.id);

  let schedulesQuery = supabase
    .from('schedules')
    .select('*')
    .eq('company_id', companyId)
    .gte('start_time', startIso)
    .lt('start_time', endIso)
    .order('start_time', { ascending: true });
  if (!includeDrafts) {
    schedulesQuery = schedulesQuery.eq('is_published', true);
  }
  const { data: scheduleRows, error: schedulesError } = await schedulesQuery;
  if (schedulesError) throw schedulesError;
  const schedules = z.array(scheduleRowSchema).parse(scheduleRows ?? []);

  const vendorEventsQuery = supabase
    .from('vendor_event')
    .select('*')
    .eq('company_id', companyId)
    .gte('event_date', startIso.split('T')[0])
    .lte('event_date', endIso.split('T')[0]);
  const [{ data: vendorEventRows, error: vendorError }, assignmentsResponse, timeOffResponse, unavailabilityResponse] =
    await Promise.all([
      vendorEventsQuery,
      schedules.length
        ? supabase
            .from('schedule_assignments')
            .select('*')
            .in(
              'schedule_id',
              schedules.map((schedule) => schedule.id),
            )
        : Promise.resolve({ data: [], error: null }),
      memberIds.length
        ? supabase
            .from('time_off_requests')
            .select('*')
            .in('user_id', memberIds)
            .order('created_at', { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      memberIds.length
        ? supabase
            .from('user_unavailability')
            .select('*')
            .in('user_id', memberIds)
            .order('start_time', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (vendorError) throw vendorError;
  if (assignmentsResponse.error) throw assignmentsResponse.error;
  if (timeOffResponse.error) throw timeOffResponse.error;
  if (unavailabilityResponse.error) throw unavailabilityResponse.error;

  const assignmentRows = z.array(assignmentRowSchema).parse(assignmentsResponse.data ?? []);
  const assignmentsWithUsers: AssignmentWithUser[] = assignmentRows.map((assignment) => ({
    ...assignment,
    user: assignment.user_id ? profileMap.get(assignment.user_id) ?? null : null,
  }));

  const shiftWithAssignments: ShiftWithAssignments[] = schedules.map((shift) => ({
    ...shift,
    assignments: assignmentsWithUsers.filter((assignment) => assignment.schedule_id === shift.id),
  }));

  const timeOffRows = z.array(timeOffRowSchema).parse(timeOffResponse.data ?? []);
  const timeOffWithUsers: TimeOffWithUser[] = timeOffRows.map((request) => ({
    ...request,
    user: request.user_id ? profileMap.get(request.user_id) ?? null : null,
  }));

  const unavailabilityRows = z.array(unavailabilityRowSchema).parse(unavailabilityResponse.data ?? []);
  const unavailabilityWithUsers: UnavailabilityWithUser[] = unavailabilityRows.map((entry) => ({
    ...entry,
    user: entry.user_id ? profileMap.get(entry.user_id) ?? null : null,
    createdBy: entry.created_by ? profileMap.get(entry.created_by) ?? null : null,
  }));

  const vendorEvents = z.array(vendorEventRowSchema).parse(vendorEventRows ?? []);

  return {
    shifts: shiftWithAssignments,
    assignments: assignmentsWithUsers,
    timeOff: timeOffWithUsers,
    unavailability: unavailabilityWithUsers,
    vendorEvents,
    teamMembers: profiles.map(({ id, first_name, last_name, email, avatar_url }) => ({
      id,
      first_name,
      last_name,
      email,
      avatar_url,
    })),
  };
}

export async function upsertShiftRecord(payload: ShiftUpsertInput): Promise<Tables<'schedules'> | null> {
  const { data, error } = await supabase
    .from('schedules')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? scheduleRowSchema.parse(data) : null;
}

export async function deleteShiftRecord(id: string): Promise<void> {
  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) throw error;
}

export async function assignUserToShift(
  shiftId: string,
  userId: string,
  status: string = 'assigned',
  assignedBy?: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from('schedule_assignments')
    .insert({ schedule_id: shiftId, user_id: userId, status, assigned_by: assignedBy ?? null });
  if (error) throw error;
  return true;
}

export async function unassignUserFromShift(shiftId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('schedule_assignments')
    .delete()
    .eq('schedule_id', shiftId)
    .eq('user_id', userId);
  if (error) throw error;
  return true;
}

export async function upsertVendorEvent(payload: VendorEventUpsertInput): Promise<VendorEventRow | null> {
  const { data, error } = await supabase.from('vendor_event').upsert(payload).select('*').maybeSingle();
  if (error) throw error;
  return data ? vendorEventRowSchema.parse(data) : null;
}

export async function deleteVendorEventRecord(id: string): Promise<void> {
  const { error } = await supabase.from('vendor_event').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkInsertShifts(payloads: TablesInsert<'schedules'>[]): Promise<void> {
  if (!payloads.length) return;
  const { error } = await supabase.from('schedules').insert(payloads);
  if (error) throw error;
}

export async function insertScheduleAssignments(payloads: TablesInsert<'schedule_assignments'>[]): Promise<void> {
  if (!payloads.length) return;
  const { error } = await supabase.from('schedule_assignments').insert(payloads);
  if (error) throw error;
}
