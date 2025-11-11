import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Json, TablesInsert } from '@/integrations/supabase/public-types';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { calendarEventsRepository, type CalendarEventRow } from '@/features/calendar/repositories/calendarEventsRepository';
import { queryKeys } from '@/lib/queryKeys';
import { CalendarError } from '@/features/calendar/types';
import { normalizeCalendarError } from '@/features/calendar/hooks/useCalendarMutationError';
import { scheduleGateway } from '@/lib/api/scheduleGateway';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const STORAGE_KEY = 'cf_events_v1';
const DEFAULT_EVENT_COLORS: Record<'meeting' | 'event' | 'vendor_visit', string> = {
  meeting: '#0ea5e9',
  event: '#6366f1',
  vendor_visit: '#f97316',
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
  type?: 'event' | 'meeting' | 'vendor_visit';
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

const sortEvents = (entries: AppEvent[]): AppEvent[] => {
  return [...entries].sort((a, b) => {
    const aTime = Date.parse(a.start ?? a.created_at ?? '') || 0;
    const bTime = Date.parse(b.start ?? b.created_at ?? '') || 0;
    return aTime - bTime;
  });
};

const buildStorageKey = (companyId?: string | null) =>
  companyId ? `${STORAGE_KEY}__${companyId}` : STORAGE_KEY;

const readStoredEvents = (key: string): AppEvent[] | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredEvent[];
    const mapped = parsed.map((entry) => ({
      ...entry,
      persisted: entry.persisted ?? true,
      source: entry.source ?? (entry.type === 'vendor_visit' ? 'vendor' : 'calendar'),
    }));
    return sortEvents(mapped);
  } catch (error) {
    console.error('Failed to parse cached events', error);
    return undefined;
  }
};

const persistStoredEvents = (key: string, events: AppEvent[]) => {
  if (typeof window === 'undefined') return;
  try {
    const payload = events.map(({ persisted, source, ...rest }) => ({ ...rest, persisted, source }));
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to persist events locally', error);
  }
};

const removeStoredEvents = (key: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear cached events', error);
  }
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
    source: metadata?.source ?? (type === 'vendor_visit' ? 'vendor' : 'calendar'),
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
    const entries = (attendees ?? []).filter((attendee) => !!attendee?.id);
    if (entries.length === 0) {
      await calendarEventsRepository.replaceEventParticipants(companyId, eventId, []);
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
    })) satisfies TablesInsert<'event_participants'>[];

    await calendarEventsRepository.replaceEventParticipants(companyId, eventId, payload);
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
    const uniqueShiftIds = Array.from(new Set((shiftIds ?? []).filter(Boolean)));
    await calendarEventsRepository.replaceEventShiftLinks(companyId, eventId, uniqueShiftIds);
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
  if (error instanceof CalendarError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
};

export function useEvents() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const storageKey = buildStorageKey(companyId);
  const defaultStorageKey = buildStorageKey(null);

  const [localEvents, setLocalEvents] = useState<AppEvent[]>(() => readStoredEvents(defaultStorageKey) ?? []);
  const offlineToastShownRef = useRef(false);

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

  const eventsQuery = useQuery({
    queryKey: companyId ? queryKeys.calendarEventsList(companyId) : queryKeys.calendarEventsDisabled,
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) return [] as AppEvent[];
      const rows = await scheduleGateway.fetchEvents({ companyId });
      return rows.map(mapRowToEvent);
    },
    initialData: () => (companyId ? readStoredEvents(storageKey) : undefined),
    staleTime: 30_000,
    retry: 1,
  });

  const events = companyId ? eventsQuery.data ?? [] : localEvents;
  const loading = companyId ? eventsQuery.isLoading || eventsQuery.isFetching : false;
  const rawError = companyId ? eventsQuery.error : null;
  const errorCode =
    companyId && rawError && typeof rawError === 'object' && rawError !== null && 'code' in rawError
      ? String((rawError as { code?: string | number }).code ?? '')
      : null;
  const error = companyId && rawError ? parseError(rawError) : null;

  useEffect(() => {
    if (companyId && eventsQuery.data) {
      persistStoredEvents(storageKey, eventsQuery.data);
    }
  }, [companyId, eventsQuery.data, storageKey]);

  useEffect(() => {
    if (!companyId) {
      persistStoredEvents(defaultStorageKey, localEvents);
    }
  }, [companyId, defaultStorageKey, localEvents]);

  useEffect(() => {
    if (companyId && eventsQuery.isError && eventsQuery.error) {
      if (!offlineToastShownRef.current) {
        toast({
          title: 'Calendar offline',
          description: parseError(eventsQuery.error),
          variant: 'default',
        });
        offlineToastShownRef.current = true;
      }
    } else if (!eventsQuery.isFetching) {
      offlineToastShownRef.current = false;
    }
  }, [companyId, eventsQuery.error, eventsQuery.isError, eventsQuery.isFetching, toast]);

  const invalidateCompanyEvents = useCallback(() => {
    if (!companyId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendarEventsCompany(companyId) });
  }, [companyId, queryClient]);

  const updateLocalEvents = useCallback(
    (updater: (previous: AppEvent[]) => AppEvent[]) => {
      setLocalEvents((previous) => {
        const next = updater(previous);
        persistStoredEvents(defaultStorageKey, next);
        return next;
      });
    },
    [defaultStorageKey],
  );

  const createEventMutation = useMutation<AppEvent, CalendarError, Omit<AppEvent, 'id'>>({
    mutationFn: async (payload) => {
      if (!companyId) throw new Error('Company context is not available');
      const normalized = withDefaults({ ...payload, type: payload.type ?? 'event' });
      const insertPayload = toInsertPayload(normalized as AppEvent, companyId, user?.id ?? null, 'calendar');
      const eventRow = await scheduleGateway.createEvent(insertPayload).catch((error) => {
        const normalizedError = normalizeCalendarError(error);
        throw new CalendarError(normalizedError.message, { code: normalizedError.code });
      });
      const persisted = mapRowToEvent(eventRow as CalendarEventRow);
      await Promise.all([
        syncEventParticipants(companyId, persisted.id, normalized.attendees),
        syncEventShiftLinks(companyId, persisted.id, normalized.related_shift_ids ?? []),
      ]);
      return persisted;
    },
    onSuccess: () => {
      invalidateCompanyEvents();
    },
    onError: (mutationError) => {
      const normalizedError = normalizeCalendarError(mutationError);
      toast({
        title: 'Event not saved',
        description: normalizedError.message,
        variant: 'destructive',
      });
    },
  });

  const createVendorVisitMutation = useMutation<AppEvent, CalendarError, Omit<AppEvent, 'id' | 'type'>>({
    mutationFn: async (payload) => {
      if (!companyId) throw new Error('Company context is not available');
      const normalized = withDefaults({ ...payload, type: 'vendor_visit' });
      const insertPayload = {
        ...toInsertPayload(normalized as AppEvent, companyId, user?.id ?? null, 'vendor'),
        event_type: 'vendor_visit',
      };
      const vendorDetails = normalized.vendor as Record<string, unknown> | undefined;
      const vendorPayload = {
        company_id: companyId,
        vendor_name: normalized.vendor?.name ?? normalized.title ?? 'Vendor Visit',
        service_type: normalized.vendor?.service_type ?? null,
        contact_email: normalized.vendor?.contact_email ?? null,
        contact_phone: normalized.vendor?.contact_phone ?? null,
        location: insertPayload.location ?? null,
        start_time: insertPayload.start_time,
        end_time: insertPayload.end_time ?? insertPayload.start_time,
        description: insertPayload.description ?? null,
        integration_id: (vendorDetails?.integration_id as string | undefined) ?? null,
        integration_type: (vendorDetails?.integration_type as 'website' | 'partner_api' | 'manual' | undefined) ?? null,
      };
      const { event } = await scheduleGateway
        .createVendorVisit({ calendar: insertPayload, vendor: vendorPayload })
        .catch((error) => {
          const normalizedError = normalizeCalendarError(error);
          throw new CalendarError(normalizedError.message, { code: normalizedError.code });
        });
      const persisted = mapRowToEvent(event as CalendarEventRow);
      await Promise.all([
        syncEventParticipants(companyId, persisted.id, normalized.attendees),
        syncEventShiftLinks(companyId, persisted.id, normalized.related_shift_ids ?? []),
      ]);
      return persisted;
    },
    onSuccess: () => {
      invalidateCompanyEvents();
    },
    onError: (mutationError) => {
      const normalizedError = normalizeCalendarError(mutationError);
      toast({
        title: 'Vendor visit not saved',
        description: normalizedError.message,
        variant: 'destructive',
      });
    },
  });

  const updateEventMutation = useMutation<AppEvent, CalendarError, { id: string; updates: Partial<AppEvent> }>({
    mutationFn: async ({ id, updates }) => {
      if (!companyId) throw new Error('Company context is not available');
      const row = await calendarEventsRepository.updateEvent(id, toUpdatePayload(updates)).catch((error) => {
        const normalizedError = normalizeCalendarError(error);
        throw new CalendarError(normalizedError.message, { code: normalizedError.code });
      });
      if (!row) {
        throw new Error('Event not found');
      }
      const persisted = mapRowToEvent(row);
      if (updates.attendees !== undefined) {
        await syncEventParticipants(companyId, id, persisted.attendees);
      }
      if (updates.related_shift_ids !== undefined) {
        await syncEventShiftLinks(
          companyId,
          id,
          updates.related_shift_ids ?? persisted.related_shift_ids ?? [],
        );
      }
      return persisted;
    },
    onSuccess: () => {
      invalidateCompanyEvents();
    },
    onError: (mutationError) => {
      const normalizedError = normalizeCalendarError(mutationError);
      toast({
        title: 'Update failed',
        description: normalizedError.message,
        variant: 'destructive',
      });
    },
  });

  const deleteEventMutation = useMutation<void, CalendarError, string>({
    mutationFn: async (id) => {
      if (!companyId) throw new Error('Company context is not available');
      await calendarEventsRepository.deleteEvent(id).catch((error) => {
        const normalizedError = normalizeCalendarError(error);
        throw new CalendarError(normalizedError.message, { code: normalizedError.code });
      });
    },
    onSuccess: () => {
      invalidateCompanyEvents();
    },
    onError: (mutationError) => {
      const normalizedError = normalizeCalendarError(mutationError);
      toast({
        title: 'Delete failed',
        description: normalizedError.message,
        variant: 'destructive',
      });
    },
  });

  const createEvent = useCallback(
    async (payload: Omit<AppEvent, 'id'>) => {
      if (!companyId) {
        const normalized = withDefaults({ ...payload, type: payload.type ?? 'event' });
        const localEvent: AppEvent = {
          ...normalized,
          id: makeId(),
          persisted: false,
          source: 'calendar',
        };
        updateLocalEvents((previous) => sortEvents([localEvent, ...previous]));
        return localEvent;
      }
      try {
        return await createEventMutation.mutateAsync(payload);
      } catch (mutationError) {
        throw new Error(parseError(mutationError));
      }
    },
    [companyId, createEventMutation, updateLocalEvents, withDefaults],
  );

  const createVendorVisit = useCallback(
    async (payload: Omit<AppEvent, 'id' | 'type'>) => {
      if (!companyId) {
        const normalized = withDefaults({ ...payload, type: 'vendor_visit' });
        const localEvent: AppEvent = {
          ...normalized,
          id: makeId(),
          persisted: false,
          source: 'vendor',
        };
        updateLocalEvents((previous) => sortEvents([localEvent, ...previous]));
        return localEvent;
      }
      try {
        return await createVendorVisitMutation.mutateAsync(payload);
      } catch (mutationError) {
        throw new Error(parseError(mutationError));
      }
    },
    [companyId, createVendorVisitMutation, updateLocalEvents, withDefaults],
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<AppEvent>) => {
      if (!companyId) {
        updateLocalEvents((previous) =>
          sortEvents(previous.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))),
        );
        return;
      }
      await updateEventMutation.mutateAsync({ id, updates });
    },
    [companyId, updateEventMutation, updateLocalEvents],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!companyId) {
        updateLocalEvents((previous) => previous.filter((entry) => entry.id !== id));
        return;
      }
      await deleteEventMutation.mutateAsync(id);
    },
    [companyId, deleteEventMutation, updateLocalEvents],
  );

  const clear = useCallback(() => {
    if (companyId) {
      queryClient.removeQueries({ queryKey: queryKeys.calendarEventsCompany(companyId) });
      persistStoredEvents(storageKey, []);
      removeStoredEvents(storageKey);
    } else {
      updateLocalEvents(() => []);
      removeStoredEvents(defaultStorageKey);
    }
  }, [companyId, defaultStorageKey, queryClient, storageKey, updateLocalEvents]);

  const getEventsForShift = useCallback(
    (shiftId: string) => events.filter((event) => (event.related_shift_ids ?? []).includes(shiftId)),
    [events],
  );

  const linkVisitToShifts = useCallback(
    async (eventId: string, shiftIds: string[]) => {
      if (!companyId) {
        updateLocalEvents((previous) =>
          sortEvents(
            previous.map((entry) => (entry.id === eventId ? { ...entry, related_shift_ids: shiftIds } : entry)),
          ),
        );
        return;
      }
      await updateEventMutation.mutateAsync({ id: eventId, updates: { related_shift_ids: shiftIds } });
    },
    [companyId, updateEventMutation, updateLocalEvents],
  );

  const toggleChecklistItem = useCallback(
    async (eventId: string, itemId: string, done: boolean) => {
      if (!companyId) {
        updateLocalEvents((previous) =>
          sortEvents(
            previous.map((entry) => {
              if (entry.id !== eventId) return entry;
              const checklist = (entry.checklist ?? []).map((item) =>
                item.id === itemId ? { ...item, done } : item,
              );
              return { ...entry, checklist };
            }),
          ),
        );
        return;
      }
      const target = events.find((entry) => entry.id === eventId);
      if (!target) return;
      const checklist = (target.checklist ?? []).map((item) =>
        item.id === itemId ? { ...item, done } : item,
      );
      await updateEventMutation.mutateAsync({ id: eventId, updates: { checklist } });
    },
    [companyId, events, updateEventMutation, updateLocalEvents],
  );

  return {
    events,
    loading,
    error,
    errorCode,
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
