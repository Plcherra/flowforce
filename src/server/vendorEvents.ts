import { supabaseAdmin } from '@/server/supabaseAdmin';
import type { Tables } from '@/integrations/supabase/public-types';

export type VendorEvent = Tables<'vendor_event'>;

export interface VendorEventInput {
  id?: string;
  company_id: string;
  location_id?: string | null;
  vendor_type: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  shift_id?: string | null;
  notes?: string | null;
}

export async function listByRange(companyId: string, start: string, end: string) {
  return supabaseAdmin
    .from('vendor_event')
    .select('*')
    .eq('company_id', companyId)
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });
}

export async function upsertVendorEvent(payload: VendorEventInput) {
  const { id, ...rest } = payload;

  if (id) {
    return supabaseAdmin
      .from('vendor_event')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
  }

  return supabaseAdmin.from('vendor_event').insert(rest).select().single();
}

export async function linkToShift(eventId: string, shiftId: string | null) {
  return supabaseAdmin
    .from('vendor_event')
    .update({ shift_id: shiftId })
    .eq('id', eventId)
    .select()
    .single();
}
