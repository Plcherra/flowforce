import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';
import { FUNCTIONS_BASE, REST_BASE, SUPABASE_ANON_KEY } from '@/lib/config';
import type {
  CalendarEventRow,
  CalendarEventRowWithRelations,
} from '@/features/calendar/repositories/calendarEventsRepository';

type VendorVisitRow = Tables<'vendor_visits'>;
type EventShiftLinkRow = Tables<'event_shift_links'>;

export type FetchEventsParams = {
  companyId: string;
  start?: string;
  end?: string;
  storeId?: string | null;
};

export type CreateVendorVisitPayload = {
  calendar: TablesInsert<'calendar_events'>;
  vendor: TablesInsert<'vendor_visits'>;
};

export interface ScheduleGateway {
  fetchEvents(params: FetchEventsParams): Promise<CalendarEventRowWithRelations[]>;
  createEvent(payload: TablesInsert<'calendar_events'>): Promise<CalendarEventRow>;
  createVendorVisit(
    payload: CreateVendorVisitPayload,
  ): Promise<{ event: CalendarEventRow; visit: VendorVisitRow | null }>;
}

type ScheduleEventResponse =
  | { event: CalendarEventRow; visit?: VendorVisitRow | null }
  | { error: string };

type CalendarEventsViewRow = CalendarEventRow & {
  participants?: Tables<'event_participants'>[] | null;
};

const AUTH_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const JSON_HEADERS = {
  ...AUTH_HEADERS,
  'Content-Type': 'application/json',
};

const isNetworkError = (error: unknown) => {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return /network\s?error|failed to fetch/i.test(error.message);
  }
  return false;
};

async function request<T>(url: string, init: RequestInit, operation: string, attempt = 0): Promise<T> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      try {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const json = (await response.json()) as Record<string, unknown>;
          const details = json?.error ?? json?.message;
          if (typeof details === 'string' && details.length > 0) {
            errorMessage = details;
          }
        } else {
          const text = await response.text();
          if (text) {
            errorMessage = text;
          }
        }
      } catch (parseError) {
        console.error('[scheduleGateway] Failed to parse error response', parseError);
      }
      console.error('[scheduleGateway] Request failed', { operation, status: response.status, errorMessage });
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return text as unknown as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (attempt === 0 && isNetworkError(error)) {
      console.warn('[scheduleGateway] Network error, retrying once', { operation });
      return request<T>(url, init, operation, attempt + 1);
    }
    console.error('[scheduleGateway] Request threw', { operation, error });
    throw error instanceof Error ? error : new Error('Network request failed');
  }
}

const fetchCalendarViewRows = async (params: FetchEventsParams): Promise<CalendarEventsViewRow[]> => {
  const searchParams = new URLSearchParams({
    select: '*',
    order: 'start_time.asc',
    company_id: `eq.${params.companyId}`,
  });

  if (params.start) {
    searchParams.append('start_time', `gte.${params.start}`);
  }
  if (params.end) {
    searchParams.append('end_time', `lte.${params.end}`);
  }
  if (params.storeId) {
    searchParams.append('store_id', `eq.${params.storeId}`);
  }

  const url = `${REST_BASE}/calendar_events_full?${searchParams.toString()}`;
  return request<CalendarEventsViewRow[]>(url, { headers: AUTH_HEADERS }, 'fetchEvents');
};

const fetchShiftLinks = async (eventIds: string[]): Promise<Map<string, EventShiftLinkRow[]>> => {
  if (eventIds.length === 0) {
    return new Map();
  }

  const filterValues = eventIds.map((id) => `"${id}"`).join(',');
  const searchParams = new URLSearchParams({
    select: '*',
    order: 'created_at.asc',
    event_id: `in.(${filterValues})`,
  });

  const url = `${REST_BASE}/event_shift_links?${searchParams.toString()}`;
  const rows = await request<EventShiftLinkRow[]>(url, { headers: AUTH_HEADERS }, 'fetchEventShiftLinks');
  return rows.reduce((map, row) => {
    const list = map.get(row.event_id) ?? [];
    list.push(row);
    map.set(row.event_id, list);
    return map;
  }, new Map<string, EventShiftLinkRow[]>());
};

const invokeScheduleEvent = async (body: Record<string, unknown>): Promise<ScheduleEventResponse> => {
  const url = `${FUNCTIONS_BASE}/schedule-event`;
  return request<ScheduleEventResponse>(
    url,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    },
    'scheduleEvent',
  );
};

const toEventWithRelations = (
  rows: CalendarEventsViewRow[],
  shiftLinks: Map<string, EventShiftLinkRow[]>,
): CalendarEventRowWithRelations[] => {
  return rows.map((row) => ({
    ...row,
    event_participants: row.participants ?? [],
    event_shift_links: shiftLinks.get(row.id) ?? [],
  }));
};

export const scheduleGateway: ScheduleGateway = {
  async fetchEvents(params) {
    const rows = await fetchCalendarViewRows(params);
    const shiftLinks = await fetchShiftLinks(rows.map((row) => row.id));
    return toEventWithRelations(rows, shiftLinks);
  },
  async createEvent(payload) {
    const response = await invokeScheduleEvent({
      type: 'meeting',
      payload: { calendar: payload },
    });

    if ('error' in response) {
      throw new Error(response.error);
    }

    return response.event;
  },
  async createVendorVisit(payload) {
    const response = await invokeScheduleEvent({
      type: 'vendor_visit',
      payload,
    });

    if ('error' in response) {
      throw new Error(response.error);
    }

    return { event: response.event, visit: response.visit ?? null };
  },
};
