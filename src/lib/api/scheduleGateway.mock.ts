import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';
import type {
  CalendarEventRow,
  CalendarEventRowWithRelations,
} from '@/features/calendar/repositories/calendarEventsRepository';
import type { CreateVendorVisitPayload, ScheduleGateway } from './scheduleGateway';

const now = () => new Date().toISOString();
const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

type CalendarInsertPayload = TablesInsert<'calendar_events'> & {
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
};

type VendorInsertPayload = TablesInsert<'vendor_visits'> & {
  created_at?: string;
};

const buildEventRow = (payload: CalendarInsertPayload): CalendarEventRow => {
  const timestamp = now();
  return {
    id: randomId(),
    company_id: payload.company_id ?? null,
    store_id: payload.store_id ?? null,
    created_by: payload.created_by ?? null,
    title: payload.title ?? 'Untitled',
    description: payload.description ?? null,
    location: payload.location ?? null,
    event_type: payload.event_type ?? 'event',
    color: payload.color ?? null,
    start_time: payload.start_time ?? timestamp,
    end_time: payload.end_time ?? payload.start_time ?? timestamp,
    attendees: payload.attendees ?? [],
    related_shift_ids: payload.related_shift_ids ?? [],
    checklist: payload.checklist ?? [],
    vendor: payload.vendor ?? null,
    metadata: payload.metadata ?? {},
    created_at: payload.created_at ?? timestamp,
    updated_at: payload.updated_at ?? timestamp,
  };
};

const buildVendorVisitRow = (payload: CreateVendorVisitPayload, linkedEventId: string): Tables<'vendor_visits'> => {
  const timestamp = now();
  const companyId = payload.vendor.company_id ?? payload.calendar.company_id ?? null;
  if (!companyId) {
    throw new Error('company_id is required for vendor visit mock data');
  }
  return {
    id: randomId(),
    company_id: companyId,
    vendor_name: payload.vendor.vendor_name ?? 'Vendor Visit',
    service_type: payload.vendor.service_type ?? null,
    contact_email: payload.vendor.contact_email ?? null,
    contact_phone: payload.vendor.contact_phone ?? null,
    location: payload.vendor.location ?? payload.calendar.location ?? null,
    start_time: payload.vendor.start_time ?? payload.calendar.start_time ?? timestamp,
    end_time: payload.vendor.end_time ?? payload.calendar.end_time ?? timestamp,
    description: payload.vendor.description ?? payload.calendar.description ?? null,
    integration_id: payload.vendor.integration_id ?? null,
    integration_type: payload.vendor.integration_type ?? null,
    linked_event_id: linkedEventId,
    created_at: (payload.vendor as VendorInsertPayload).created_at ?? timestamp,
  };
};

const mockEventsBase: CalendarEventRowWithRelations[] = [
  {
    id: 'mock-event-1',
    company_id: 'mock-company',
    store_id: null,
    created_by: null,
    title: 'Mock Strategy Session',
    description: 'Design preview data',
    location: 'HQ',
    event_type: 'meeting',
    color: '#0ea5e9',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    attendees: [],
    related_shift_ids: [],
    checklist: [],
    vendor: null,
    metadata: {},
    created_at: now(),
    updated_at: now(),
    event_participants: [],
    event_shift_links: [],
  },
];

export const MockGateway: ScheduleGateway = {
  async fetchEvents() {
    return clone(mockEventsBase);
  },
  async createEvent(payload) {
    return buildEventRow(payload);
  },
  async createVendorVisit(payload) {
    const event = buildEventRow({ ...payload.calendar, event_type: 'vendor_visit' });
    const visit = buildVendorVisitRow(payload, event.id);
    return { event, visit };
  },
};
