import { supabaseAdmin } from '@/server/supabaseAdmin';
import type { Tables } from '@/integrations/supabase/public-types';
import { logger } from '@/utils/logger';

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
  // vendor_event is now a view based on vendor_visits table
  // It has start_time/end_time (timestamptz) instead of event_date
  return supabaseAdmin
    .from('vendor_event')
    .select('*')
    .eq('company_id', companyId)
    .gte('start_time', start)
    .lt('start_time', end)
    .order('start_time', { ascending: true });
}

export async function upsertVendorEvent(payload: VendorEventInput) {
  const { id, vendor_type, event_date, start_time, end_time, shift_id, notes, location_id, ...rest } = payload;

  // Map old schema to new vendor_visits schema
  // vendor_type -> service_type
  // event_date + start_time/end_time -> start_time/end_time (timestamptz)
  // notes -> description
  // location_id -> location (as string, not UUID reference)
  
  // Convert event_date + time to timestamptz
  let startTime: string | undefined;
  let endTime: string | undefined;
  
  if (event_date) {
    const dateStr = event_date.split('T')[0]; // Get date part only
    startTime = start_time ? `${dateStr}T${start_time}` : `${dateStr}T00:00:00`;
    endTime = end_time ? `${dateStr}T${end_time}` : `${dateStr}T23:59:59`;
  } else if (start_time && end_time) {
    startTime = start_time;
    endTime = end_time;
  }

  const vendorVisitPayload = {
    ...rest,
    vendor_name: vendor_type || 'Vendor Visit', // Map vendor_type to vendor_name
    service_type: vendor_type || null,
    start_time: startTime,
    end_time: endTime,
    description: notes || null,
    location: location_id ? String(location_id) : rest.location || null,
    // Note: shift_id is not in vendor_visits schema, would need linked_event_id if linking to calendar
  };

  if (id) {
    return supabaseAdmin
      .from('vendor_visits')
      .update(vendorVisitPayload)
      .eq('id', id)
      .select()
      .single();
  }

  return supabaseAdmin.from('vendor_visits').insert(vendorVisitPayload).select().single();
}

export async function linkToShift(eventId: string, shiftId: string | null) {
  // Note: vendor_visits doesn't have shift_id field
  // If you need to link vendor visits to shifts, consider using linked_event_id
  // to link to a calendar_event that references the shift
  logger.warn('linkToShift: vendor_visits table does not support shift_id. Consider using linked_event_id instead', { tags: ['warning'] });
  return { data: null, error: new Error('shift_id is not supported in vendor_visits schema') };
}
