import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import type { Tables } from '@/integrations/supabase/public-types';
import type { AppEvent, EventAttendee } from '@/hooks/useEvents';

type CalendarEventRow = Tables<'calendar_events'> & {
  event_participants?: Tables<'event_participants'>[] | null;
  event_shift_links?: Tables<'event_shift_links'>[] | null;
};

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
  metadata: Tables<'calendar_events'>['metadata'];
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

const parseAttendeesJson = (value: Tables<'calendar_events'>['attendees']): CalendarEventParticipant[] => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return [];
  }

  const payload = Array.isArray(value) ? value : [];

  return payload
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => {
      const id = typeof entry.id === 'string' ? entry.id : '';
      const attendeeName =
        typeof entry.name === 'string'
          ? entry.name
          : `${typeof entry.first_name === 'string' ? entry.first_name : ''} ${
              typeof entry.last_name === 'string' ? entry.last_name : ''
            }`.trim();
      const fallbackName = attendeeName || (typeof entry.email === 'string' ? entry.email : 'Participant');

      return {
        id: id || fallbackName,
        name: fallbackName,
        avatar_url: typeof entry.avatar_url === 'string' ? entry.avatar_url : null,
        role: typeof entry.role === 'string' ? entry.role : null,
      };
    })
    .filter((attendee) => !!attendee.id);
};

const mapRowToEvent = (row: CalendarEventRow): CalendarEvent => {
  const participantRows = Array.isArray(row.event_participants) ? row.event_participants : [];
  const shiftLinks = Array.isArray(row.event_shift_links) ? row.event_shift_links : [];

  const participantMap = new Map<string, CalendarEventParticipant>();

  parseAttendeesJson(row.attendees).forEach((attendee) => {
    participantMap.set(attendee.id, attendee);
  });

  participantRows.forEach((participant) => {
    const key = participant.profile_id ?? participant.email ?? participant.id;
    if (!key) return;
    const name =
      participant.name ??
      participant.email ??
      participant.profile_id ??
      (participant.id ? `Participant ${participant.id.slice(0, 6)}` : 'Participant');

    participantMap.set(key, {
      id: key,
      name,
      avatar_url: participant.avatar_url ?? null,
      role: participant.role ?? null,
      participantId: participant.id,
      profileId: participant.profile_id ?? null,
      responseStatus: participant.response_status ?? null,
    });
  });

  const shiftIds = Array.from(
    new Set([
      ...(Array.isArray(row.related_shift_ids) ? row.related_shift_ids.filter(Boolean) : []),
      ...shiftLinks.map((link) => link.shift_id).filter(Boolean),
    ]),
  );

  return {
    id: row.id,
    title: row.title ?? 'Untitled',
    description: row.description ?? null,
    start: row.start_time,
    end: row.end_time ?? null,
    location: row.location ?? null,
    type: row.event_type ?? 'event',
    color: row.color ?? null,
    storeId: row.store_id ?? null,
    participants: Array.from(participantMap.values()),
    shiftIds,
    metadata: row.metadata ?? {},
    raw: row,
  };
};

export function useCalendarEvents(params: UseCalendarEventsParams): UseCalendarEventsResult {
  const { storeId = null, range, enabled = true } = params;
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isoRange = useMemo(() => toIsoRange(range), [range]);

  const refresh = useCallback(async () => {
    if (!enabled || !companyId || !isoRange) {
      setEvents([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('calendar_events')
        .select('*, event_participants(*), event_shift_links(*)')
        .eq('company_id', companyId)
        .gte('start_time', isoRange.start)
        .lte('start_time', isoRange.end)
        .order('start_time', { ascending: true });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const response = await query;
      if (response.error) {
        throw response.error;
      }

      const rows = (response.data ?? []) as CalendarEventRow[];
      setEvents(rows.map(mapRowToEvent));
    } catch (err) {
      console.error('Failed to load calendar events', err);
      setEvents([]);
      setError(err instanceof Error ? err.message : 'Unable to load events');
    } finally {
      setLoading(false);
    }
  }, [companyId, enabled, isoRange, storeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    events,
    loading,
    error,
    refresh,
  };
}

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
    color: event.color ?? null,
    start_time: event.start,
    end_time: event.end ?? null,
    attendees: event.attendees ?? [],
    related_shift_ids: event.related_shift_ids ?? [],
    checklist: event.checklist ?? [],
    vendor: event.vendor ?? null,
    metadata: { source: event.source ?? 'local' } as Record<string, unknown>,
    created_at: event.created_at ?? new Date().toISOString(),
    updated_at: event.created_at ?? new Date().toISOString(),
    event_participants: [],
    event_shift_links: [],
  };

  return {
    id: event.id,
    title: event.title ?? 'Untitled',
    description: event.description ?? null,
    start: event.start,
    end: event.end ?? null,
    location: event.location ?? null,
    type: event.type ?? 'event',
    color: event.color ?? null,
    storeId: null,
    participants,
    shiftIds: event.related_shift_ids ?? [],
    metadata: rawRow.metadata,
    raw: rawRow,
  };
};
