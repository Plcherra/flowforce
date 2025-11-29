// @ts-nocheck
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import type { Tables } from '@/integrations/supabase/public-types';
import type { AppEvent, EventAttendee, ChecklistItem } from '@/hooks/useEvents';
import { calendarEventsRepository, type CalendarEventRowWithRelations } from '@/features/calendar/repositories/calendarEventsRepository';
import { queryKeys } from '@/lib/queryKeys';

type CalendarEventRow = CalendarEventRowWithRelations;

type CalendarRange = {
  start: Date | string;
  end: Date | string;
};

export type CalendarEventParticipant = EventAttendee & {
  participantId?: string;
  profileId?: string | null;
  responseStatus?: string | null;
};

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string | null;
  location: string | null;
  type: string;
  color: string | null;
  storeId: string | null;
  participants: CalendarEventParticipant[];
  shiftIds: string[];
  metadata: Record<string, unknown>;
  raw: CalendarEventRow;
}

export interface UseCalendarEventsParams {
  storeId?: string | null;
  range: CalendarRange;
  enabled?: boolean;
}

export interface UseCalendarEventsResult {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const toIsoString = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  return date.toISOString();
};

const toIsoRange = (range: CalendarRange) => {
  const parse = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const startDate = parse(range.start);
  const endDate = parse(range.end);

  if (!startDate || !endDate) {
    return null;
  }

  const [min, max] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  return {
    start: min.toISOString(),
    end: max.toISOString(),
  };
};


const mapRowToEvent = (row: CalendarEventRow): CalendarEvent => {
  const participantRows = Array.isArray(row.event_participants) ? row.event_participants : [];

  const participants: CalendarEventParticipant[] = participantRows.map((participant) => ({
    id: participant.profile_id ?? participant.id,
    name: participant.profile_id ?? `Participant ${participant.id.slice(0, 6)}`,
    avatar_url: null,
    role: participant.role ?? null,
    participantId: participant.id,
    profileId: participant.profile_id ?? null,
    responseStatus: participant.rsvp_status ?? null,
  }));

  return {
    id: row.id,
    title: row.title ?? 'Untitled',
    description: row.description ?? null,
    start: row.start_time,
    end: row.end_time ?? null,
    location: row.location ?? null,
    type: row.event_type ?? 'event',
    color: null,
    storeId: row.store_id ?? null,
    participants,
    shiftIds: [],
    metadata: {},
    raw: row,
  };
};

export function useCalendarEvents(params: UseCalendarEventsParams): UseCalendarEventsResult {
  const { storeId = null, range, enabled = true } = params;
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const isoRange = useMemo(() => toIsoRange(range), [range]);
  const normalizedStoreId = storeId ?? null;
  const queryEnabled = Boolean(enabled && companyId && isoRange);

  const eventsQuery = useQuery({
    queryKey: queryEnabled && companyId && isoRange
      ? queryKeys.calendarEventsRange(companyId, isoRange.start, isoRange.end, normalizedStoreId)
      : queryKeys.calendarEventsDisabled,
    queryFn: async () => {
      if (!companyId || !isoRange) {
        return [] as CalendarEvent[];
      }
      const rows = await calendarEventsRepository.listCompanyEventsByRange({
        companyId,
        startIso: isoRange.start,
        endIso: isoRange.end,
        storeId: normalizedStoreId,
      });
      return rows.map(mapRowToEvent);
    },
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  const events = eventsQuery.data ?? [];
  const loading = queryEnabled ? eventsQuery.isLoading || eventsQuery.isFetching : false;
  const error =
    eventsQuery.error instanceof Error
      ? eventsQuery.error.message
      : eventsQuery.error
        ? 'Unable to load events'
        : null;

  const refresh = useCallback(async () => {
    await eventsQuery.refetch();
  }, [eventsQuery]);

  return {
    events,
    loading,
    error,
    refresh,
  };
}

export interface CalendarEventCreateInput {
  title: string;
  description?: string | null;
  location?: string | null;
  type?: 'event' | 'meeting' | 'vendor';
  color?: string | null;
  start: string | Date;
  end?: string | Date | null;
  storeId?: string | null;
  attendees?: EventAttendee[];
  relatedShiftIds?: string[];
  checklist?: ChecklistItem[];
  vendor?: AppEvent['vendor'];
  metadata?: Record<string, unknown>;
}

export interface CreateEventOptions {
  payload: CalendarEventCreateInput;
  companyId: string | null;
  createdBy: string | null;
}

export const createEvent = async ({ payload, companyId, createdBy }: CreateEventOptions): Promise<CalendarEvent> => {
  if (!companyId) {
    throw new Error('Company context is required to create events.');
  }

  const insertPayload = {
    company_id: companyId,
    created_by: createdBy,
    store_id: payload.storeId ?? null,
    title: payload.title,
    description: payload.description ?? null,
    location: payload.location ?? null,
    event_type: payload.type ?? 'event',
    start_time: toIsoString(payload.start),
    end_time: toIsoString(payload.end),
  };

  const row = await calendarEventsRepository.insertEvent(insertPayload);
  return mapRowToEvent(row as CalendarEventRow);
};

export const mapAppEventToCalendarEvent = (event: AppEvent): CalendarEvent => {
  const participants: CalendarEventParticipant[] = (event.attendees ?? []).map((attendee) => ({
    id: attendee.id,
    name: attendee.name,
    avatar_url: attendee.avatar_url ?? null,
    role: attendee.role ?? null,
  }));

  const rawRow: CalendarEventRow = {
    id: event.id,
    company_id: null,
    store_id: null,
    created_by: null,
    title: event.title ?? 'Untitled',
    description: event.description ?? null,
    location: event.location ?? null,
    event_type: event.type ?? 'event',
    start_time: event.start,
    end_time: event.end ?? null,
    created_at: event.created_at ?? new Date().toISOString(),
    updated_at: event.created_at ?? new Date().toISOString(),
    event_participants: [],
  };

  return {
    id: event.id,
    title: event.title ?? 'Untitled',
    description: event.description ?? null,
    start: event.start,
    end: event.end ?? null,
    location: event.location ?? null,
    type: event.type ?? 'event',
    color: null,
    storeId: null,
    participants,
    shiftIds: [],
    metadata: {},
    raw: rawRow,
  };
};
