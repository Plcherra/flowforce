// @ts-nocheck
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/public-types';

export type CalendarEventRow = Tables<'calendar_events'>;
export type CalendarEventRowWithRelations = CalendarEventRow & {
  event_participants?: Tables<'event_participants'>[] | null;
};

async function listCompanyEvents(companyId: string): Promise<CalendarEventRow[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('company_id', companyId)
    .order('start_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CalendarEventRow[];
}

async function listCompanyEventsByRange(params: {
  companyId: string;
  startIso: string;
  endIso: string;
  storeId?: string | null;
}): Promise<CalendarEventRowWithRelations[]> {
  const { companyId, startIso, endIso, storeId = null } = params;

  let query = supabase
    .from('calendar_events')
    .select('*, event_participants(*)')
    .eq('company_id', companyId)
    .gte('start_time', startIso)
    .lte('start_time', endIso)
    .order('start_time', { ascending: true });

  if (storeId) {
    query = query.eq('store_id', storeId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as CalendarEventRowWithRelations[];
}

async function insertEvent(payload: TablesInsert<'calendar_events'>): Promise<CalendarEventRow> {
  const { data, error } = await supabase.from('calendar_events').insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  return data as CalendarEventRow;
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

  return data as CalendarEventRow | null;
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
  // Delete existing participants
  const { error: deleteError } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('company_id', companyId);

  if (deleteError) {
    throw deleteError;
  }

  // Insert new participants if any
  if (participants.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('event_participants').insert(participants);
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
};
