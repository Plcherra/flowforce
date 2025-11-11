import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/public-types';

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(jsonSchema), z.array(jsonSchema)]),
);

const calendarEventRowSchema: z.ZodType<Tables<'calendar_events'>> = z.object({
  attendees: jsonSchema,
  checklist: jsonSchema,
  color: z.string().nullable(),
  company_id: z.string().nullable(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  description: z.string().nullable(),
  end_time: z.string().nullable(),
  event_type: z.string(),
  id: z.string(),
  location: z.string().nullable(),
  metadata: jsonSchema,
  related_shift_ids: z.array(z.string()).nullable(),
  start_time: z.string(),
  store_id: z.string().nullable(),
  title: z.string(),
  updated_at: z.string(),
  vendor: jsonSchema,
});

const eventParticipantRowSchema: z.ZodType<Tables<'event_participants'>> = z.object({
  avatar_url: z.string().nullable(),
  company_id: z.string(),
  created_at: z.string(),
  email: z.string().nullable(),
  event_id: z.string(),
  id: z.string(),
  metadata: jsonSchema.nullable(),
  name: z.string().nullable(),
  profile_id: z.string().nullable(),
  response_status: z.string().nullable(),
  role: z.string().nullable(),
  updated_at: z.string(),
});

const eventShiftLinkRowSchema: z.ZodType<Tables<'event_shift_links'>> = z.object({
  company_id: z.string(),
  created_at: z.string(),
  event_id: z.string(),
  id: z.string(),
  linked_at: z.string().nullable(),
  metadata: jsonSchema.nullable(),
  shift_id: z.string(),
  store_id: z.string().nullable(),
  updated_at: z.string(),
});

export type CalendarEventRow = Tables<'calendar_events'>;
export type CalendarEventRowWithRelations = CalendarEventRow & {
  event_participants?: Tables<'event_participants'>[] | null;
  event_shift_links?: Tables<'event_shift_links'>[] | null;
};

type CalendarEventViewRow = CalendarEventRow & {
  participants?: Tables<'event_participants'>[] | null;
};

const calendarEventViewRowSchema: z.ZodType<CalendarEventViewRow> = calendarEventRowSchema.extend({
  participants: z.array(eventParticipantRowSchema).nullable().optional(),
});

const CALENDAR_EVENTS_VIEW = 'calendar_events_full' as const;

const CALENDAR_EVENTS_VIEW_SELECT = [
  'id',
  'company_id',
  'store_id',
  'created_by',
  'title',
  'description',
  'location',
  'event_type',
  'color',
  'start_time',
  'end_time',
  'attendees',
  'related_shift_ids',
  'checklist',
  'vendor',
  'metadata',
  'created_at',
  'updated_at',
  'participants',
].join(',');

type CalendarEventsQueryOptions = {
  companyId: string;
  startIso?: string;
  endIso?: string;
  storeId?: string | null;
};

async function fetchCalendarEventsWithRelations(
  options: CalendarEventsQueryOptions,
): Promise<CalendarEventRowWithRelations[]> {
  const { companyId, startIso, endIso, storeId } = options;

  // calendar_events_full view isn't in the generated Database types yet, so we cast here.
  let query = supabase
    .from(CALENDAR_EVENTS_VIEW as never)
    .select(CALENDAR_EVENTS_VIEW_SELECT)
    .eq('company_id', companyId)
    .order('start_time', { ascending: true });

  if (startIso) {
    query = query.gte('start_time', startIso);
  }
  if (endIso) {
    query = query.lte('end_time', endIso);
  }
  if (storeId) {
    query = query.eq('store_id', storeId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = z.array(calendarEventViewRowSchema).parse(data ?? []);
  const eventIds = rows.map((row) => row.id);

  let shiftLinksMap = new Map<string, Tables<'event_shift_links'>[]>();
  if (eventIds.length > 0) {
    const { data: shiftLinkRows, error: shiftLinkError } = await supabase
      .from('event_shift_links')
      .select('*')
      .in('event_id', eventIds);
    if (shiftLinkError) {
      throw shiftLinkError;
    }
    const parsedShiftLinks = z.array(eventShiftLinkRowSchema).parse(shiftLinkRows ?? []);
    shiftLinksMap = parsedShiftLinks.reduce((map, link) => {
      const list = map.get(link.event_id) ?? [];
      list.push(link);
      map.set(link.event_id, list);
      return map;
    }, new Map<string, Tables<'event_shift_links'>[]>());
  }

  return rows.map((row) => {
    const { participants, ...rest } = row;
    return {
      ...rest,
      event_participants: participants ?? [],
      event_shift_links: shiftLinksMap.get(row.id) ?? [],
    };
  });
}

async function listCompanyEvents(companyId: string): Promise<CalendarEventRowWithRelations[]> {
  return fetchCalendarEventsWithRelations({ companyId });
}

async function listCompanyEventsByRange(params: {
  companyId: string;
  startIso: string;
  endIso: string;
  storeId?: string | null;
}): Promise<CalendarEventRowWithRelations[]> {
  const { companyId, startIso, endIso, storeId = null } = params;
  return fetchCalendarEventsWithRelations({
    companyId,
    startIso,
    endIso,
    storeId,
  });
}

async function insertEvent(payload: TablesInsert<'calendar_events'>): Promise<CalendarEventRow> {
  const { data, error } = await supabase.from('calendar_events').insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  return calendarEventRowSchema.parse(data);
}

async function updateEvent(id: string, updates: TablesUpdate<'calendar_events'>): Promise<CalendarEventRow | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? calendarEventRowSchema.parse(data) : null;
}

async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

async function replaceEventParticipants(
  companyId: string,
  eventId: string,
  participants: TablesInsert<'event_participants'>[],
): Promise<void> {
  const rpcResponse = await supabase.rpc('replace_event_participants', {
    p_company_id: companyId,
    p_event_id: eventId,
    p_participants: participants as unknown as Json,
  });

  if (!rpcResponse.error) {
    return;
  }

  console.warn('replace_event_participants RPC unavailable, falling back to manual sync', rpcResponse.error);

  const { error: deleteError } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('company_id', companyId);

  if (deleteError) {
    throw deleteError;
  }

  if (participants.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('event_participants').insert(participants);
  if (insertError) {
    throw insertError;
  }
}

async function replaceEventShiftLinks(
  companyId: string,
  eventId: string,
  shiftIds: string[],
): Promise<void> {
  const rpcResponse = await supabase.rpc('replace_event_shift_links', {
    p_company_id: companyId,
    p_event_id: eventId,
    p_shift_ids: shiftIds,
  });

  if (!rpcResponse.error) {
    return;
  }

  console.warn('replace_event_shift_links RPC unavailable, falling back to manual sync', rpcResponse.error);

  const { error: deleteError } = await supabase
    .from('event_shift_links')
    .delete()
    .eq('event_id', eventId)
    .eq('company_id', companyId);

  if (deleteError) {
    throw deleteError;
  }

  if (shiftIds.length === 0) {
    return;
  }

  const payload = shiftIds.map((shiftId) => ({
    event_id: eventId,
    shift_id: shiftId,
    company_id: companyId,
    store_id: null,
    metadata: {},
  })) satisfies TablesInsert<'event_shift_links'>[];

  const { error: insertError } = await supabase.from('event_shift_links').insert(payload);
  if (insertError) {
    throw insertError;
  }
}

export const calendarEventsRepository = {
  listCompanyEvents,
  listCompanyEventsByRange,
  insertEvent,
  updateEvent,
  deleteEvent,
  replaceEventParticipants,
  replaceEventShiftLinks,
};
