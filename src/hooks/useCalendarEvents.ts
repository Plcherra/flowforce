import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import type { Tables } from "@/integrations/supabase/public-types";
import type { AppEvent, EventAttendee, ChecklistItem } from "@/hooks/useEvents";
import {
  calendarEventsRepository,
  type CalendarEventRowWithRelations,
} from "@/features/calendar/repositories/calendarEventsRepository";
import { queryKeys } from "@/lib/queryKeys";
import { scheduleGateway } from "@/lib/api/scheduleGateway";

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
  attendees?: CalendarEventParticipant[];
  shiftIds: string[];
  metadata: Tables<"calendar_events">["metadata"];
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
    throw new Error("Invalid date value");
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

  const [min, max] =
    startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  return {
    start: min.toISOString(),
    end: max.toISOString(),
  };
};

const parseAttendeesJson = (
  value: Tables<"calendar_events">["attendees"],
): CalendarEventParticipant[] => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return [];
  }

  const payload = Array.isArray(value) ? value : [];

  return payload
    .filter(
      (entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === "object",
    )
    .map((entry) => {
      const id = typeof entry.id === "string" ? entry.id : "";
      const attendeeName =
        typeof entry.name === "string"
          ? entry.name
          : `${typeof entry.first_name === "string" ? entry.first_name : ""} ${
              typeof entry.last_name === "string" ? entry.last_name : ""
            }`.trim();
      const fallbackName =
        attendeeName ||
        (typeof entry.email === "string" ? entry.email : "Participant");

      return {
        id: id || fallbackName,
        name: fallbackName,
        avatar_url:
          typeof entry.avatar_url === "string" ? entry.avatar_url : null,
        role: typeof entry.role === "string" ? entry.role : null,
      };
    })
    .filter((attendee) => !!attendee.id);
};

const mapRowToEvent = (row: CalendarEventRow): CalendarEvent => {
  const participantRows = Array.isArray(row.event_participants)
    ? row.event_participants
    : [];
  const shiftLinks = Array.isArray(row.event_shift_links)
    ? row.event_shift_links
    : [];

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
      (participant.id
        ? `Participant ${participant.id.slice(0, 6)}`
        : "Participant");

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
      ...(Array.isArray(row.related_shift_ids)
        ? row.related_shift_ids.filter(Boolean)
        : []),
      ...shiftLinks.map((link) => link.shift_id).filter(Boolean),
    ]),
  );

  return {
    id: row.id,
    title: row.title ?? "Untitled",
    description: row.description ?? null,
    start: row.start_time,
    end: row.end_time ?? null,
    location: row.location ?? null,
    type: row.event_type ?? "event",
    color: row.color ?? null,
    storeId: row.store_id ?? null,
    participants: Array.from(participantMap.values()),
    shiftIds,
    metadata: row.metadata ?? {},
    raw: row,
  };
};

export function useCalendarEvents(
  params: UseCalendarEventsParams,
): UseCalendarEventsResult {
  const { storeId = null, range, enabled = true } = params;
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const isoRange = toIsoRange(range);
  const normalizedStoreId = storeId ?? null;
  const queryEnabled = Boolean(enabled && companyId && isoRange);

  const eventsQuery = useQuery({
    queryKey:
      queryEnabled && companyId && isoRange
        ? queryKeys.calendarEventsRange(
            companyId,
            isoRange.start,
            isoRange.end,
            normalizedStoreId,
          )
        : queryKeys.calendarEventsDisabled,
    queryFn: async () => {
      if (!companyId || !isoRange) {
        return [] as CalendarEvent[];
      }
      const rows = await scheduleGateway.fetchEvents({
        companyId,
        start: isoRange.start,
        end: isoRange.end,
        storeId: normalizedStoreId,
      });
      const list = Array.isArray(rows) ? rows : [];
      return list.map(mapRowToEvent);
    },
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  const events = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
  const loading = queryEnabled
    ? eventsQuery.isLoading || eventsQuery.isFetching
    : false;
  const error =
    eventsQuery.error instanceof Error
      ? eventsQuery.error.message
      : eventsQuery.error
        ? "Unable to load events"
        : null;

  const refresh = async () => {
    await eventsQuery.refetch();
  };

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
  type?: "event" | "meeting" | "vendor_visit";
  color?: string | null;
  start: string | Date;
  end?: string | Date | null;
  storeId?: string | null;
  attendees?: EventAttendee[];
  relatedShiftIds?: string[];
  checklist?: ChecklistItem[];
  vendor?: AppEvent["vendor"];
  metadata?: Record<string, unknown>;
}

export interface CreateEventOptions {
  payload: CalendarEventCreateInput;
  companyId: string | null;
  createdBy: string | null;
}

export const createEvent = async ({
  payload,
  companyId,
  createdBy,
}: CreateEventOptions): Promise<CalendarEvent> => {
  if (!companyId) {
    throw new Error("Company context is required to create events.");
  }

  const insertPayload = {
    company_id: companyId,
    created_by: createdBy,
    store_id: payload.storeId ?? null,
    title: payload.title,
    description: payload.description ?? null,
    location: payload.location ?? null,
    event_type: payload.type ?? "event",
    color: payload.color ?? null,
    start_time: toIsoString(payload.start),
    end_time: toIsoString(payload.end),
    attendees: payload.attendees ?? [],
    related_shift_ids: payload.relatedShiftIds ?? [],
    checklist: payload.checklist ?? [],
    vendor: payload.vendor ?? null,
    metadata: payload.metadata ?? {},
  };

  const eventType = insertPayload.event_type;
  if (eventType === "vendor_visit") {
    const { event } = await scheduleGateway.createVendorVisit({
      calendar: { ...insertPayload, event_type: "vendor_visit" },
      vendor: {
        company_id: companyId,
        vendor_name: payload.vendor?.name ?? payload.title,
        service_type: payload.vendor?.service_type ?? null,
        contact_email: payload.vendor?.contact_email ?? null,
        contact_phone: payload.vendor?.contact_phone ?? null,
        location: insertPayload.location ?? null,
        start_time: insertPayload.start_time,
        end_time: insertPayload.end_time ?? insertPayload.start_time,
        description: insertPayload.description ?? null,
        integrationid: (payload.vendor as Record<string, unknown> | undefined)
          ?.integrationid as string | undefined | null,
        integration_type: (
          payload.vendor as Record<string, unknown> | undefined
        )?.integration_type as
          | "website"
          | "partner_api"
          | "manual"
          | undefined
          | null,
      },
    });
    return mapRowToEvent(event as CalendarEventRow);
  }

  const createdEvent = await scheduleGateway.createEvent(insertPayload);
  return mapRowToEvent(createdEvent as CalendarEventRow);
};

export const upsertEventShiftLinks = async ({
  eventId,
  shiftIds,
  companyId,
}: {
  eventId: string;
  shiftIds: string[];
  companyId: string | null;
}) => {
  if (!eventId || !companyId) return;
  await calendarEventsRepository.replaceEventShiftLinks(
    companyId,
    eventId,
    shiftIds,
  );
};

export const mapAppEventToCalendarEvent = (event: AppEvent): CalendarEvent => {
  const participants: CalendarEventParticipant[] = (event.attendees ?? []).map(
    (attendee) => ({
      id: attendee.id,
      name: attendee.name,
      avatar_url: attendee.avatar_url ?? null,
      role: attendee.role ?? null,
    }),
  );

  const rawRow: CalendarEventRow = {
    id: event.id,
    company_id: null,
    store_id: null,
    created_by: null,
    title: event.title ?? "Untitled",
    description: event.description ?? null,
    location: event.location ?? null,
    event_type: event.type ?? "event",
    color: event.color ?? null,
    start_time: event.start,
    end_time: event.end ?? null,
    attendees: event.attendees ?? [],
    related_shift_ids: event.related_shift_ids ?? [],
    checklist: event.checklist ?? [],
    vendor: event.vendor ?? null,
    metadata: { source: event.source ?? "local" } as Record<string, unknown>,
    created_at: event.created_at ?? new Date().toISOString(),
    updated_at: event.created_at ?? new Date().toISOString(),
    event_participants: [],
    event_shift_links: [],
  };

  return {
    id: event.id,
    title: event.title ?? "Untitled",
    description: event.description ?? null,
    start: event.start,
    end: event.end ?? null,
    location: event.location ?? null,
    type: event.type ?? "event",
    color: event.color ?? null,
    storeId: null,
    participants,
    shiftIds: event.related_shift_ids ?? [],
    metadata: rawRow.metadata,
    raw: rawRow,
  };
};
