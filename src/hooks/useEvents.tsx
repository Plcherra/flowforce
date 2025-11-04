import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/public-types';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const STORAGE_KEY = 'cf_events_v1';
const CALENDAR_TABLE = 'calendar_events';
const DEFAULT_EVENT_COLORS: Record<'meeting' | 'event' | 'vendor', string> = {
  meeting: '#0ea5e9',
  event: '#6366f1',
  vendor: '#f97316',
};

type EventSource = 'calendar' | 'vendor' | 'local';

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  who?: 'vendor' | 'supervisor';
};

export type EventAttendee = {
  id: string;
  name: string;
  avatar_url?: string | null;
  role?: string | null;
};

export type AppEvent = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  location?: string;
  type?: 'event' | 'meeting' | 'vendor';
  color?: string | null;
  vendor?: {
    name: string;
    service_type?: string;
    contact?: string;
  };
  related_shift_ids?: string[];
  attendees?: EventAttendee[];
  checklist?: ChecklistItem[];
  created_at?: string;
  persisted?: boolean;
  source?: EventSource;
};

type StoredEvent = Omit<AppEvent, 'persisted' | 'source'> & {
  persisted?: boolean;
  source?: EventSource;
};

type CalendarEventRow = {
  id: string;
  company_id: string | null;
  created_by: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  event_type: string | null;
  color: string | null;
  start_time: string;
  end_time: string | null;
  attendees: Json | null;
  related_shift_ids: string[] | null;
  checklist: Json | null;
  vendor: Json | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
};

const sortEvents = (entries: AppEvent[]): AppEvent[] => {
  return [...entries].sort((a, b) => {
    const aTime = Date.parse(a.start ?? a.created_at ?? '') || 0;
    const bTime = Date.parse(b.start ?? b.created_at ?? '') || 0;
    return aTime - bTime;
  });
};

const normaliseAttendees = (value: unknown): EventAttendee[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is EventAttendee => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as EventAttendee;
      return typeof candidate.id === 'string' && typeof candidate.name === 'string';
    })
    .map((attendee) => ({
      id: attendee.id,
      name: attendee.name,
      avatar_url: attendee.avatar_url ?? null,
      role: attendee.role ?? null,
    }));
};

const normaliseChecklist = (value: unknown): ChecklistItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ChecklistItem => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as ChecklistItem;
      return typeof candidate.id === 'string' && typeof candidate.text === 'string';
    })
    .map((item) => ({
      id: item.id,
      text: item.text,
      done: Boolean(item.done),
      who: item.who,
    }));
};

const mapRowToEvent = (row: CalendarEventRow): AppEvent => {
  const type = (row.event_type as AppEvent['type']) ?? 'event';
  const metadata = (row.metadata as { source?: EventSource } | null) ?? null;

  return {
    id: row.id,
    title: row.title ?? 'Untitled event',
    description: row.description ?? undefined,
    start: row.start_time,
    end: row.end_time ?? undefined,
    location: row.location ?? undefined,
    type,
    color: row.color ?? DEFAULT_EVENT_COLORS[type ?? 'event'],
    attendees: normaliseAttendees(row.attendees),
    related_shift_ids: Array.isArray(row.related_shift_ids) ? row.related_shift_ids : [],
    checklist: normaliseChecklist(row.checklist),
    vendor: (row.vendor as AppEvent['vendor']) ?? undefined,
    created_at: row.created_at ?? undefined,
    persisted: true,
    source: metadata?.source ?? (type === 'vendor' ? 'vendor' : 'calendar'),
  };
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const syncEventParticipants = async (
  companyId: string | null,
  eventId: string,
  attendees?: EventAttendee[],
) => {
  if (!companyId) return;
  try {
    await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('company_id', companyId);

    const entries = (attendees ?? []).filter((attendee) => !!attendee?.id);
    if (entries.length === 0) {
      return;
    }

    const payload = entries.map((attendee) => ({
      event_id: eventId,
      company_id: companyId,
      profile_id: UUID_PATTERN.test(attendee.id) ? attendee.id : null,
      email: null,
      name: attendee.name,
      role: attendee.role ?? null,
      avatar_url: attendee.avatar_url ?? null,
      response_status: 'invited',
      metadata: { source_attendee_id: attendee.id },
    }));

    await supabase.from('event_participants').insert(payload);
  } catch (error) {
    console.warn('Failed to sync event participants', error);
  }
};

const syncEventShiftLinks = async (
  companyId: string | null,
  eventId: string,
  shiftIds?: string[],
) => {
  if (!companyId) return;
  try {
    await supabase
      .from('event_shift_links')
      .delete()
      .eq('event_id', eventId)
      .eq('company_id', companyId);

    const uniqueShiftIds = Array.from(new Set((shiftIds ?? []).filter(Boolean)));
    if (uniqueShiftIds.length === 0) {
      return;
    }

    const payload = uniqueShiftIds.map((shiftId) => ({
      event_id: eventId,
      shift_id: shiftId,
      company_id: companyId,
      store_id: null,
      metadata: {},
    }));

    await supabase.from('event_shift_links').insert(payload);
  } catch (error) {
    console.warn('Failed to sync event shift links', error);
  }
};

const toInsertPayload = (
  event: Omit<AppEvent, 'id' | 'persisted' | 'source'>,
  companyId: string | null,
  createdBy: string | null,
  source: EventSource,
) => {
  const typeKey = (event.type ?? 'event') as keyof typeof DEFAULT_EVENT_COLORS;
  return {
    company_id: companyId,
    created_by: createdBy,
    title: event.title,
    description: event.description ?? null,
    location: event.location ?? null,
    event_type: event.type ?? 'event',
    color: event.color ?? DEFAULT_EVENT_COLORS[typeKey],
    start_time: event.start,
    end_time: event.end ?? null,
    attendees: event.attendees ?? [],
    related_shift_ids: event.related_shift_ids ?? [],
    checklist: event.checklist ?? [],
    vendor: event.vendor ?? null,
    metadata: { source },
  };
};

const toUpdatePayload = (updates: Partial<AppEvent>) => {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description ?? null;
  if (updates.location !== undefined) payload.location = updates.location ?? null;
  if (updates.type !== undefined) payload.event_type = updates.type ?? 'event';
  if (updates.color !== undefined) payload.color = updates.color ?? null;
  if (updates.start !== undefined) payload.start_time = updates.start;
  if (updates.end !== undefined) payload.end_time = updates.end ?? null;
  if (updates.attendees !== undefined) payload.attendees = updates.attendees ?? [];
  if (updates.related_shift_ids !== undefined) payload.related_shift_ids = updates.related_shift_ids ?? [];
  if (updates.checklist !== undefined) payload.checklist = updates.checklist ?? [];
  if (updates.vendor !== undefined) payload.vendor = updates.vendor ?? null;
  return payload;
};

const parseError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
};

export function useEvents() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const eventsRef = useRef<AppEvent[]>([]);
  const initialisedRef = useRef(false);

  const defaultColorByType = useMemo(() => DEFAULT_EVENT_COLORS, []);

  const withDefaults = useCallback(
    (event: Omit<AppEvent, 'id'>): Omit<AppEvent, 'id'> => ({
      attendees: [],
      related_shift_ids: [],
      checklist: [],
      created_at: new Date().toISOString(),
      color:
        event.color ??
        (event.type && defaultColorByType[event.type as keyof typeof defaultColorByType]
          ? defaultColorByType[event.type as keyof typeof defaultColorByType]
          : defaultColorByType.event),
      ...event,
    }),
    [defaultColorByType],
  );

  const mergeRemoteEvents = useCallback((remote: AppEvent[]) => {
    setEvents((previous) => {
      const remoteMap = new Map(remote.map((entry) => [entry.id, entry]));
      const leftovers = previous.filter((entry) => !remoteMap.has(entry.id) || entry.persisted === false);
      return sortEvents([...remote, ...leftovers]);
    });
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setEvents([]);
      } else {
        const parsed = JSON.parse(raw) as StoredEvent[];
        const mapped = parsed.map((entry) => ({
          ...entry,
          persisted: entry.persisted ?? true,
          source: entry.source ?? (entry.type === 'vendor' ? 'vendor' : 'calendar'),
        }));
        setEvents(sortEvents(mapped));
      }
    } catch (error) {
      console.error('Failed to parse cached events', error);
      setEvents([]);
    } finally {
      initialisedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    eventsRef.current = events;
    try {
      const serialised = JSON.stringify(events.map(({ persisted, source, ...rest }) => ({ ...rest, persisted, source })));
      localStorage.setItem(STORAGE_KEY, serialised);
    } catch (error) {
      console.error('Failed to persist events locally', error);
    }
  }, [events]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    let cancelled = false;

    const fetchRemote = async () => {
      setLoading(true);
      try {
        const response = await supabase
          .from<CalendarEventRow>(CALENDAR_TABLE as never)
          .select('*')
          .eq('company_id', companyId)
          .order('start_time', { ascending: true });

        if (response.error) {
          throw response.error;
        }

        const remote = (response.data ?? []).map(mapRowToEvent);
        if (!cancelled) {
          mergeRemoteEvents(remote);
        }
      } catch (error) {
        console.warn('Unable to load calendar events from Supabase', error);
        if (!cancelled && initialisedRef.current) {
          toast({
            title: 'Calendar offline',
            description: 'Showing cached events while we reconnect.',
            variant: 'default',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRemote();

    return () => {
      cancelled = true;
    };
  }, [companyId, mergeRemoteEvents, toast]);

  const createEvent = useCallback(
    async (payload: Omit<AppEvent, 'id'>) => {
      const normalized = withDefaults({ ...payload, type: payload.type ?? 'event' });
      const optimistic: AppEvent = {
        ...normalized,
        id: makeId(),
        persisted: false,
        source: 'calendar',
      };

      setEvents((prev) => sortEvents([optimistic, ...prev]));

      if (!companyId) {
        return optimistic;
      }

      try {
        const insertPayload = toInsertPayload(normalized as AppEvent, companyId, user?.id ?? null, 'calendar');
        const response = await supabase
          .from<CalendarEventRow>(CALENDAR_TABLE as never)
          .insert(insertPayload)
          .select()
          .single();

        if (response.error) throw response.error;

        const persisted = mapRowToEvent(response.data);
        await Promise.all([
          syncEventParticipants(companyId, persisted.id, normalized.attendees),
          syncEventShiftLinks(companyId, persisted.id, normalized.related_shift_ids ?? []),
        ]);
        setEvents((prev) =>
          sortEvents(
            prev.map((entry) => (entry.id === optimistic.id ? { ...persisted, source: 'calendar' } : entry)),
          ),
        );
        return persisted;
      } catch (error) {
        console.error('Failed to save event', error);
        setEvents((prev) => prev.filter((entry) => entry.id !== optimistic.id));
        toast({
          title: 'Event not saved',
          description: parseError(error),
          variant: 'destructive',
        });
        throw error;
      }
    },
    [companyId, toast, user?.id, withDefaults],
  );

  const createVendorVisit = useCallback(
    async (payload: Omit<AppEvent, 'id' | 'type'>) => {
      const normalized = withDefaults({ ...payload, type: 'vendor' });
      const optimistic: AppEvent = {
        ...normalized,
        id: makeId(),
        persisted: false,
        source: 'vendor',
      };

      setEvents((prev) => sortEvents([optimistic, ...prev]));

      if (!companyId) {
        return optimistic;
      }

      try {
        const insertPayload = {
          ...toInsertPayload(normalized as AppEvent, companyId, user?.id ?? null, 'vendor'),
          event_type: 'vendor',
        };
        const response = await supabase
          .from<CalendarEventRow>(CALENDAR_TABLE as never)
          .insert(insertPayload)
          .select()
          .single();

        if (response.error) throw response.error;

        const persisted = mapRowToEvent(response.data);
        await Promise.all([
          syncEventParticipants(companyId, persisted.id, normalized.attendees),
          syncEventShiftLinks(companyId, persisted.id, normalized.related_shift_ids ?? []),
        ]);
        setEvents((prev) =>
          sortEvents(
            prev.map((entry) => (entry.id === optimistic.id ? { ...persisted, source: 'vendor' } : entry)),
          ),
        );
        return persisted;
      } catch (error) {
        console.error('Failed to save vendor visit', error);
        setEvents((prev) => prev.filter((entry) => entry.id !== optimistic.id));
        toast({
          title: 'Vendor visit not saved',
          description: parseError(error),
          variant: 'destructive',
        });
        throw error;
      }
    },
    [companyId, toast, user?.id, withDefaults],
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<AppEvent>) => {
      const previous = eventsRef.current;
      const target = previous.find((entry) => entry.id === id);
      if (!target) return;

      const next = { ...target, ...updates };
      setEvents((prev) => sortEvents(prev.map((entry) => (entry.id === id ? next : entry))));

      if (!companyId || target.source === 'local') {
        return;
      }

      try {
        const response = await supabase
          .from<CalendarEventRow>(CALENDAR_TABLE as never)
          .update(toUpdatePayload({ ...updates, type: target.type }))
          .eq('id', id)
          .select()
          .maybeSingle();

        if (response?.error) throw response.error;
        if (response?.data) {
          const persisted = mapRowToEvent(response.data);
          await Promise.all([
            syncEventParticipants(companyId, id, persisted.attendees),
            syncEventShiftLinks(companyId, id, persisted.related_shift_ids),
          ]);
          setEvents((prev) =>
            sortEvents(prev.map((entry) => (entry.id === id ? { ...persisted, source: target.source } : entry))),
          );
        }
      } catch (error) {
        console.error('Failed to update event', error);
        setEvents(previous);
        toast({
          title: 'Update failed',
          description: parseError(error),
          variant: 'destructive',
        });
      }
    },
    [companyId, toast],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const previous = eventsRef.current;
      const target = previous.find((entry) => entry.id === id);
      if (!target) return;

      setEvents((prev) => prev.filter((entry) => entry.id !== id));

      if (!companyId || target.source === 'local') {
        return;
      }

      try {
        const response = await supabase.from(CALENDAR_TABLE as never).delete().eq('id', id);
        if (response.error) throw response.error;
      } catch (error) {
        console.error('Failed to delete event', error);
        setEvents(previous);
        toast({
          title: 'Delete failed',
          description: parseError(error),
          variant: 'destructive',
        });
      }
    },
    [companyId, toast],
  );

  const clear = useCallback(() => {
    setEvents([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear cached events', error);
    }
  }, []);

  const getEventsForShift = useCallback(
    (shiftId: string) => eventsRef.current.filter((event) => (event.related_shift_ids ?? []).includes(shiftId)),
    [],
  );

  const linkVisitToShifts = useCallback(
    async (eventId: string, shiftIds: string[]) => {
      const previous = eventsRef.current;
      const target = previous.find((entry) => entry.id === eventId);
      if (!target) return;

      const next = { ...target, related_shift_ids: shiftIds };
      setEvents((prev) => sortEvents(prev.map((entry) => (entry.id === eventId ? next : entry))));

      if (!companyId || target.source === 'local') {
        return;
      }

      try {
        const response = await supabase
          .from(CALENDAR_TABLE as never)
          .update({ related_shift_ids: shiftIds, updated_at: new Date().toISOString() })
          .eq('id', eventId);
        if (response.error) throw response.error;
        await syncEventShiftLinks(companyId, eventId, shiftIds);
      } catch (error) {
        console.error('Failed to link event to shifts', error);
        setEvents(previous);
        toast({
          title: 'Unable to link shifts',
          description: parseError(error),
          variant: 'destructive',
        });
      }
    },
    [companyId, toast],
  );

  const toggleChecklistItem = useCallback(
    async (eventId: string, itemId: string, done: boolean) => {
      const previous = eventsRef.current;
      const target = previous.find((entry) => entry.id === eventId);
      if (!target) return;

      const checklist = (target.checklist ?? []).map((item) =>
        item.id === itemId ? { ...item, done } : item,
      );
      const next = { ...target, checklist };

      setEvents((prev) => sortEvents(prev.map((entry) => (entry.id === eventId ? next : entry))));

      if (!companyId || target.source === 'local') {
        return;
      }

      try {
        const response = await supabase
          .from(CALENDAR_TABLE as never)
          .update({ checklist, updated_at: new Date().toISOString() })
          .eq('id', eventId);
        if (response.error) throw response.error;
      } catch (error) {
        console.error('Failed to update checklist', error);
        setEvents(previous);
        toast({
          title: 'Checklist update failed',
          description: parseError(error),
          variant: 'destructive',
        });
      }
    },
    [companyId, toast],
  );

  return {
    events,
    loading,
    createEvent,
    createVendorVisit,
    updateEvent,
    deleteEvent,
    clear,
    getEventsForShift,
    linkVisitToShifts,
    toggleChecklistItem,
  } as const;
}
