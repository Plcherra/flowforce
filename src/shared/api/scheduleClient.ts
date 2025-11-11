import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';

const FUNCTION_NAME = 'schedule-event';
const isDemoMode = () => String(import.meta.env.VITE_DEMO_MODE ?? 'false') === 'true';

interface ScheduleMeetingResponse {
  demo?: boolean;
  event: Pick<Tables<'calendar_events'>, 'id' | 'title' | 'start_time' | 'end_time' | 'event_type'> & Record<string, unknown>;
}

interface ScheduleVendorVisitResponse extends ScheduleMeetingResponse {
  visit?: Tables<'vendor_visits'> & Record<string, unknown>;
}

async function invokeScheduleFunction<TResponse>(body: Record<string, unknown>): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(FUNCTION_NAME, {
    body,
  });

  if (error) {
    const message = error.message || error.name || 'Unable to schedule event';
    throw new Error(message);
  }

  if (!data) {
    throw new Error('Empty response from schedule-event function');
  }

  return data;
}

function buildDemoEvent(type: 'meeting' | 'vendor_visit', title?: string) {
  return {
    id: crypto.randomUUID(),
    title: title ?? (type === 'vendor_visit' ? 'Vendor Visit' : 'Meeting'),
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    event_type: type,
  };
}

export async function scheduleMeeting(payload: TablesInsert<'calendar_events'>): Promise<ScheduleMeetingResponse> {
  if (isDemoMode()) {
    console.log('Demo mode: event creation skipped', payload);
    return { demo: true, event: buildDemoEvent('meeting', payload.title ?? undefined) };
  }
  return invokeScheduleFunction<ScheduleMeetingResponse>({ type: 'meeting', payload: { calendar: payload } });
}

export async function scheduleVendorVisit(payload: {
  calendar: TablesInsert<'calendar_events'>;
  vendor: {
    company_id: string;
    vendor_name: string;
    service_type?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    location?: string | null;
    start_time: string;
    end_time: string;
    description?: string | null;
    integration_id?: string | null;
    integration_type?: 'website' | 'partner_api' | 'manual' | null;
  };
}): Promise<ScheduleVendorVisitResponse> {
  if (isDemoMode()) {
    console.log('Demo mode: vendor visit creation skipped', payload);
    return { demo: true, event: buildDemoEvent('vendor_visit', payload.calendar.title) };
  }
  return invokeScheduleFunction<ScheduleVendorVisitResponse>({ type: 'vendor_visit', payload });
}
