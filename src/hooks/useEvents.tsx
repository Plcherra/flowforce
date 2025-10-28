import { useEffect, useMemo, useState } from 'react';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

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
  start: string; // ISO
  end?: string; // ISO
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
};

const STORAGE_KEY = 'cf_events_v1';

export function useEvents() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultColorByType = useMemo(
    () =>
      ({
        meeting: '#0ea5e9',
        event: '#6366f1',
        vendor: '#f97316',
      }) satisfies Record<NonNullable<AppEvent['type']>, string>,
    [],
  );

  const withDefaults = (event: Omit<AppEvent, 'id'>): Omit<AppEvent, 'id'> => ({
    attendees: [],
    related_shift_ids: [],
    checklist: [],
    created_at: new Date().toISOString(),
    ...event,
    color: event.color ?? (event.type ? defaultColorByType[event.type] ?? '#6366f1' : '#6366f1'),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: AppEvent[] = raw
        ? (JSON.parse(raw) as AppEvent[]).map((event) => ({
            ...event,
            attendees: event.attendees ?? [],
            related_shift_ids: event.related_shift_ids ?? [],
            checklist: event.checklist ?? [],
            color: event.color ?? (event.type ? defaultColorByType[event.type] ?? '#6366f1' : '#6366f1'),
          }))
        : [];
      setEvents(parsed);
    } catch (err) {
      console.error('Failed to load events from storage', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [defaultColorByType]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (err) {
      console.error('Failed to persist events to storage', err);
    }
  }, [events]);

  const createEvent = async (payload: Omit<AppEvent, 'id'>) => {
    const normalized = withDefaults(payload);
    const e: AppEvent = { ...normalized, id: makeId() };
    setEvents((s) => [e, ...s]);
    return e;
  };

  const createVendorVisit = async (payload: Omit<AppEvent, 'id' | 'type'>) => {
    return await createEvent({ ...payload, type: 'vendor' });
  };

  const updateEvent = async (id: string, updates: Partial<AppEvent>) => {
    setEvents((s) => s.map(ev => ev.id === id ? { ...ev, ...updates } : ev));
  };

  const deleteEvent = async (id: string) => {
    setEvents((s) => s.filter(ev => ev.id !== id));
  };

  const clear = () => setEvents([]);

  const getEventsForShift = (shiftId: string) => {
    return events.filter(ev => (ev.related_shift_ids || []).includes(shiftId));
  };

  const linkVisitToShifts = async (eventId: string, shiftIds: string[]) => {
    setEvents((s) => s.map(ev => {
      if (ev.id !== eventId) return ev;
      const current = new Set(ev.related_shift_ids || []);
      shiftIds.forEach(id => current.add(id));
      return { ...ev, related_shift_ids: Array.from(current) };
    }));
  };

  const toggleChecklistItem = async (eventId: string, itemId: string, done: boolean) => {
    setEvents((s) => s.map(ev => {
      if (ev.id !== eventId) return ev;
      const checklist = (ev.checklist || []).map(it => it.id === itemId ? { ...it, done } : it);
      return { ...ev, checklist };
    }));
  };

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
    toggleChecklistItem
  } as const;
}
