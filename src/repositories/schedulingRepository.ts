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

// vendor_event is now a view based on vendor_visits
// Schema: id, vendor_name, service_type, location, start_time, end_time, description, company_id
const vendorEventRowSchema = z
  .object({
    id: z.string(),
    company_id: z.string().nullable(),
    vendor_name: z.string().nullable(),
    service_type: z.string().nullable(),
    location: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    description: z.string().nullable(),
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

  // vendor_event is now a view based on vendor_visits table
  // It has start_time/end_time (timestamptz) instead of event_date
  const vendorEventsQuery = supabase
    .from('vendor_event')
    .select('*')
    .eq('company_id', companyId)
    .gte('start_time', startIso)
    .lt('start_time', endIso);
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

export async function deleteShiftRecord(id: string, companyId?: string | null): Promise<void> {
  let query = supabase.from('schedules').delete().eq('id', id);
  
  // Add company_id filter if provided for security
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { error } = await query;
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
  // vendor_event is a view, so we need to insert/update vendor_visits instead
  const { id, vendor_type, event_date, start_time, end_time, shift_id, notes, location_id, company_id, ...rest } = payload;

  // Map old schema to new vendor_visits schema
  let startTime: string | undefined;
  let endTime: string | undefined;
  
  if (event_date) {
    const dateStr = event_date.split('T')[0];
    startTime = start_time ? `${dateStr}T${start_time}` : `${dateStr}T00:00:00`;
    endTime = end_time ? `${dateStr}T${end_time}` : `${dateStr}T23:59:59`;
  } else if (start_time && end_time) {
    startTime = start_time;
    endTime = end_time;
  }

  const vendorVisitPayload = {
    company_id: company_id || undefined,
    vendor_name: vendor_type || 'Vendor Visit',
    service_type: vendor_type || null,
    start_time: startTime,
    end_time: endTime,
    description: notes || null,
    location: location_id ? String(location_id) : rest.location || null,
    // Note: shift_id is not supported in vendor_visits schema
  };

  let result;
  if (id) {
    result = await supabase.from('vendor_visits').update(vendorVisitPayload).eq('id', id).select('*').maybeSingle();
  } else {
    result = await supabase.from('vendor_visits').insert(vendorVisitPayload).select('*').maybeSingle();
  }

  if (result.error) throw result.error;
  
  // Map back to vendor_event view schema for return type
  if (result.data) {
    const mapped = {
      id: result.data.id,
      company_id: result.data.company_id,
      vendor_name: result.data.vendor_name,
      service_type: result.data.service_type,
      location: result.data.location,
      start_time: result.data.start_time,
      end_time: result.data.end_time,
      description: result.data.description,
    };
    return vendorEventRowSchema.parse(mapped);
  }
  
  return null;
}

export async function deleteVendorEventRecord(id: string, companyId?: string | null): Promise<void> {
  // vendor_event is a view, so we need to delete from vendor_visits
  let query = supabase.from('vendor_visits').delete().eq('id', id);
  
  // Add company_id filter if provided for security
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { error } = await query;
  if (error) throw error;
}

export async function insertSchedules(payloads: TablesInsert<'schedules'>[]): Promise<Tables<'schedules'>[]> {
  if (!payloads.length) return [];
  
  // Validate that all payloads have company_id for security
  const invalidPayloads = payloads.filter(p => !p.company_id);
  if (invalidPayloads.length > 0) {
    throw new Error(`All schedules must have company_id. ${invalidPayloads.length} payload(s) missing company_id.`);
  }
  
  const { data, error } = await supabase.from('schedules').insert(payloads).select('*');
  if (error) throw error;
  return z.array(scheduleRowSchema).parse(data ?? []);
}

export async function insertScheduleAssignments(payloads: TablesInsert<'schedule_assignments'>[]): Promise<void> {
  if (!payloads.length) return;
  const { error } = await supabase.from('schedule_assignments').insert(payloads);
  if (error) throw error;
}

export async function deleteCopilotDrafts(params: {
  companyId: string;
  locationName: string;
  locationId: string;
  weekStartIso: string;
  weekEndIso: string;
}): Promise<void> {
  const { companyId, locationName, locationId, weekStartIso, weekEndIso } = params;
  const { data, error } = await supabase
    .from('schedules')
    .select('id, requirements')
    .eq('company_id', companyId)
    .eq('location', locationName)
    .eq('is_published', false)
    .gte('start_time', weekStartIso)
    .lt('start_time', weekEndIso);
  if (error) throw error;

  const draftIds =
    data
      ?.filter((row) => {
        const requirements = row.requirements as { copilot?: { locationId?: string; weekStart?: string } } | null;
        const copilot = requirements?.copilot;
        return copilot?.locationId === locationId && copilot?.weekStart === weekStartIso;
      })
      .map((row) => row.id) ?? [];

  if (!draftIds.length) return;

  const { error: deleteAssignments } = await supabase
    .from('schedule_assignments')
    .delete()
    .in('schedule_id', draftIds);
  if (deleteAssignments) throw deleteAssignments;

  // Add company_id filter to prevent cross-tenant deletion
  const { error: deleteSchedules } = await supabase
    .from('schedules')
    .delete()
    .in('id', draftIds)
    .eq('company_id', companyId);
  if (deleteSchedules) throw deleteSchedules;
}
