import { useEffect, useState } from 'react';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  who?: 'vendor' | 'supervisor';
};

export type AppEvent = {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO
  end?: string; // ISO
  location?: string;
  type?: 'event' | 'meeting' | 'vendor';
  vendor?: {
    name: string;
    service_type?: string;
    contact?: string;
  };
  related_shift_ids?: string[];
  checklist?: ChecklistItem[];
};

const STORAGE_KEY = 'cf_events_v1';

export function useEvents() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: AppEvent[] = raw ? JSON.parse(raw) : [];
      setEvents(parsed);
    } catch (err) {
      console.error('Failed to load events from storage', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (err) {
      console.error('Failed to persist events to storage', err);
    }
  }, [events]);

  const createEvent = async (payload: Omit<AppEvent, 'id'>) => {
    const e: AppEvent = { ...payload, id: makeId() };
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
