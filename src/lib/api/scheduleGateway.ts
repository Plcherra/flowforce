import type {
  Tables,
  TablesInsert,
} from "@/integrations/supabase/public-types";
import { REST_BASE, SUPABASE_ANON_KEY } from "@/lib/config";
import type {
  CalendarEventRow,
  CalendarEventRowWithRelations,
} from "@/features/calendar/repositories/calendarEventsRepository";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

type VendorVisitRow = Tables<"vendor_visits">;
type EventShiftLinkRow = Tables<"event_shift_links">;

export type FetchEventsParams = {
  companyId: string;
  start?: string;
  end?: string;
  storeId?: string | null;
};

export type CreateVendorVisitPayload = {
  calendar: TablesInsert<"calendar_events">;
  vendor: TablesInsert<"vendor_visits">;
};

export interface ScheduleGateway {
  fetchEvents(
    params: FetchEventsParams,
  ): Promise<CalendarEventRowWithRelations[]>;
  createEvent(
    payload: TablesInsert<"calendar_events">,
  ): Promise<CalendarEventRow>;
  createVendorVisit(
    payload: CreateVendorVisitPayload,
  ): Promise<{ event: CalendarEventRow; visit: VendorVisitRow | null }>;
}

type CalendarEventsViewRow = CalendarEventRow & {
  participants?: Tables<"event_participants">[] | null;
};

const getAuthHeaders = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
};

const isNetworkError = (error: unknown) => {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return /network\s?error|failed to fetch/i.test(error.message);
  }
  return false;
};

async function request<T>(
  url: string,
  init: RequestInit,
  operation: string,
  attempt = 0,
): Promise<T> {
  try {
    if (!url || url === "/functions/v1" || url === "/rest/v1") {
      throw new Error(
        `Invalid URL for ${operation}: ${url}. Check SUPABASE_URL configuration.`,
      );
    }

    const response = await fetch(url, init);
    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      try {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const json = (await response.json()) as Record<string, unknown>;
          const details = json?.error ?? json?.message;
          if (typeof details === "string" && details.length > 0) {
            errorMessage = details;
          }
        } else {
          const text = await response.text();
          if (text) {
            errorMessage = text;
          }
        }
      } catch (parseError) {
        logger.error("[scheduleGateway] Failed to parse error response", {
          error: parseError,
          tags: ["error"],
        });
      }
      logger.error("[scheduleGateway] Request failed", {
        context: { operation, status: response.status, errorMessage, url },
        tags: ["error"],
      });
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return text as unknown as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (attempt === 0 && isNetworkError(error)) {
      logger.warn("[scheduleGateway] Network error, retrying once", {
        context: { operation, url },
        tags: ["warning"],
      });
      return request<T>(url, init, operation, attempt + 1);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[scheduleGateway] Request threw", {
      context: { operation, url, attempt },
      error: errorMessage,
      errorDetails:
        error instanceof Error
          ? { name: error.name, stack: error.stack }
          : error,
      tags: ["error"],
    });

    // Provide more helpful error messages
    if (
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError")
    ) {
      throw new Error(
        `Cannot connect to Supabase function. Check your SUPABASE_URL configuration and ensure the function is deployed.`,
      );
    }

    throw error instanceof Error
      ? error
      : new Error(`Network request failed: ${errorMessage}`);
  }
}

const fetchCalendarViewRows = async (
  params: FetchEventsParams,
): Promise<CalendarEventsViewRow[]> => {
  const searchParams = new URLSearchParams({
    select: "*",
    order: "start_time.asc",
    company_id: `eq.${params.companyId}`,
  });

  if (params.start) {
    searchParams.append("start_time", `gte.${params.start}`);
  }
  if (params.end) {
    searchParams.append("end_time", `lte.${params.end}`);
  }
  if (params.storeId) {
    searchParams.append("store_id", `eq.${params.storeId}`);
  }

  const url = `${REST_BASE}/calendar_events_full?${searchParams.toString()}`;
  return request<CalendarEventsViewRow[]>(
    url,
    { headers: await getAuthHeaders() },
    "fetchEvents",
  );
};

const fetchShiftLinks = async (
  eventIds: string[],
): Promise<Map<string, EventShiftLinkRow[]>> => {
  if (eventIds.length === 0) {
    return new Map();
  }

  const filterValues = eventIds.map((id) => `"${id}"`).join(",");
  const searchParams = new URLSearchParams({
    select: "*",
    order: "created_at.asc",
    event_id: `in.(${filterValues})`,
  });

  const url = `${REST_BASE}/event_shift_links?${searchParams.toString()}`;
  const rows = await request<EventShiftLinkRow[]>(
    url,
    { headers: await getAuthHeaders() },
    "fetchEventShiftLinks",
  );
  return rows.reduce((map, row) => {
    const list = map.get(row.event_id) ?? [];
    list.push(row);
    map.set(row.event_id, list);
    return map;
  }, new Map<string, EventShiftLinkRow[]>());
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
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(payload)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Could not save the event");
    }
    return data;
  },
  async createVendorVisit(payload) {
    const { data: event, error: eventError } = await supabase
      .from("calendar_events")
      .insert(payload.calendar)
      .select("*")
      .single();
    if (eventError || !event) {
      throw new Error(eventError?.message ?? "Could not save the vendor visit");
    }

    const { data: visit, error: visitError } = await supabase
      .from("vendor_visits")
      .insert({
        company_id: payload.vendor.company_id ?? event.company_id,
        vendor_name: payload.vendor.vendor_name ?? event.title ?? "Vendor Visit",
        service_type: payload.vendor.service_type ?? null,
        contact_email: payload.vendor.contact_email ?? null,
        contact_phone: payload.vendor.contact_phone ?? null,
        location: payload.vendor.location ?? event.location ?? null,
        start_time: payload.vendor.start_time ?? event.start_time,
        end_time: payload.vendor.end_time ?? event.end_time ?? event.start_time,
        description: payload.vendor.description ?? event.description ?? null,
        integration_id: payload.vendor.integration_id ?? null,
        integration_type: payload.vendor.integration_type ?? null,
        linked_event_id: event.id,
      })
      .select("*")
      .single();
    if (visitError || !visit) {
      await supabase.from("calendar_events").delete().eq("id", event.id);
      throw new Error(visitError?.message ?? "Could not save the vendor visit");
    }

    return { event, visit };
  },
};
