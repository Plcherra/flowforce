import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';

const ENDPOINT = '/functions/v1/schedule-event';
const isDemoMode = () => String(import.meta.env.VITE_DEMO_MODE ?? 'false') === 'true';

interface ScheduleMeetingResponse {
  demo?: boolean;
  event: Pick<Tables<'calendar_events'>, 'id' | 'title' | 'start_time' | 'end_time' | 'event_type'> & Record<string, unknown>;
}

interface ScheduleVendorVisitResponse extends ScheduleMeetingResponse {
  visit?: Tables<'vendor_visits'> & Record<string, unknown>;
}

async function postScheduleEvent(body: unknown) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Unable to schedule event');
  }
  return response.json();
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
  return postScheduleEvent({ type: 'meeting', payload: { calendar: payload } });
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
  return postScheduleEvent({ type: 'vendor_visit', payload });
}
