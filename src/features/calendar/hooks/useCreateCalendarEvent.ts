import { useEvents, type AppEvent } from '@/hooks/useEvents';
import { useProfile } from '@/hooks/useProfile';

export function useCreateCalendarEvent() {
  const { createEvent: createEventMutation } = useEvents();
  const { profile } = useProfile();
  
  const createEvent = async (payload: {
    title: string;
    description?: string;
    location?: string;
    type?: 'event' | 'meeting' | 'vendor_visit';
    start: string;
    end?: string;
    attendees?: Array<{ id: string; name: string; avatar_url?: string | null; role?: string | null }>;
    related_shift_ids?: string[];
  }): Promise<AppEvent> => {
    const eventPayload: Omit<AppEvent, 'id'> = {
      title: payload.title,
      description: payload.description,
      location: payload.location,
      type: payload.type ?? 'event',
      start: payload.start,
      end: payload.end,
      attendees: payload.attendees ?? [],
      related_shift_ids: payload.related_shift_ids ?? [],
    };
    
    return await createEventMutation(eventPayload);
  };
  
  return {
    createEvent,
  };
}
