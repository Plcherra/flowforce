import { useEvents } from '@/hooks/useEvents';

export function useCreateCalendarEvent() {
  const { createEvent } = useEvents();
  return {
    createEvent,
  };
}
