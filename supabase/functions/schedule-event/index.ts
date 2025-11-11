import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CalendarPayload = Record<string, unknown> & {
  company_id?: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  event_type?: string;
  created_by?: string | null;
};

type VendorPayload = {
  company_id?: string;
  vendor_name?: string;
  service_type?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  location?: string | null;
  start_time?: string;
  end_time?: string;
  description?: string | null;
  integration_id?: string | null;
  integration_type?: "website" | "partner_api" | "manual" | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials for schedule-event function");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const normalizeTimes = (payload: CalendarPayload, fallbackType: string) => {
  const start = payload.start_time ?? (payload as Record<string, string | undefined>).start;
  const end = payload.end_time ?? (payload as Record<string, string | undefined>).end ?? start;
  if (!start || !end) {
    throw new Error("start_time and end_time are required");
  }
  return {
    ...payload,
    start_time: start,
    end_time: end,
    event_type: payload.event_type ?? fallbackType,
  } satisfies CalendarPayload;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();
    const type = body?.type as string;
    const payload = body?.payload as { calendar?: CalendarPayload; vendor?: VendorPayload } | CalendarPayload;

    if (!type || !payload) {
      return respond({ error: "Missing type or payload" }, 400);
    }

    const calendarPayload = (payload as { calendar?: CalendarPayload }).calendar ?? (payload as CalendarPayload);

    if (type === "meeting") {
      const eventPayload = normalizeTimes(calendarPayload, "meeting");
      const { data: event, error } = await supabase
        .from("calendar_events")
        .insert(eventPayload)
        .select("*")
        .single();
      if (error) throw error;
      return respond({ event });
    }

    if (type === "vendor_visit") {
      const vendorPayload = (payload as { vendor?: VendorPayload }).vendor ?? {};
      const eventPayload = normalizeTimes(calendarPayload, "vendor_visit");
      const { data: event, error: eventError } = await supabase
        .from("calendar_events")
        .insert(eventPayload)
        .select("*")
        .single();
      if (eventError) throw eventError;

      const visitPayload = {
        company_id: vendorPayload.company_id ?? event.company_id,
        vendor_name: vendorPayload.vendor_name ?? (event.title ?? "Vendor Visit"),
        service_type: vendorPayload.service_type ?? null,
        contact_email: vendorPayload.contact_email ?? null,
        contact_phone: vendorPayload.contact_phone ?? null,
        location: vendorPayload.location ?? (event.location ?? null),
        start_time: vendorPayload.start_time ?? event.start_time,
        end_time: vendorPayload.end_time ?? event.end_time,
        description: vendorPayload.description ?? (event.description ?? null),
        integration_id: vendorPayload.integration_id ?? null,
        integration_type: vendorPayload.integration_type ?? null,
        linked_event_id: event.id,
      } satisfies VendorPayload & { company_id: string; linked_event_id: string };

      if (!visitPayload.company_id) {
        throw new Error("company_id is required for vendor visits");
      }

      const { data: visit, error: visitError } = await supabase
        .from("vendor_visits")
        .insert(visitPayload)
        .select("*")
        .single();
      if (visitError) throw visitError;
      return respond({ event, visit });
    }

    return respond({ error: "Invalid type" }, 400);
  } catch (error) {
    console.error("[schedule-event]", error);
    const message = error instanceof Error ? error.message : String(error);
    return respond({ error: message }, 500);
  }
});
