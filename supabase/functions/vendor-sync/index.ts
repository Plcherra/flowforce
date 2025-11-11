// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type VendorVisitRecord = {
  id: string;
  company_id: string;
  vendor_name: string;
  service_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  description: string | null;
  integration_id: string | null;
  integration_type: string | null;
  integration_webhook: string | null;
  sync_status?: "pending" | "sent" | "failed";
};

type ChangeEvent<T> = {
  type: "INSERT" | "UPDATE" | string;
  table: string;
  schema: string;
  record: T;
  old_record?: T | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration for vendor-sync function");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const serializeVisitPayload = (visit: VendorVisitRecord) => ({
  id: visit.id,
  company_id: visit.company_id,
  vendor_name: visit.vendor_name,
  service_type: visit.service_type,
  contact_email: visit.contact_email,
  contact_phone: visit.contact_phone,
  location: visit.location,
  start_time: visit.start_time,
  end_time: visit.end_time,
  description: visit.description,
  integration_id: visit.integration_id,
  integration_type: visit.integration_type
});

const logSyncAttempt = async (
  visit: VendorVisitRecord,
  details: {
    status: "pending" | "success" | "failed";
    responseStatus?: number | null;
    responseBody?: string | null;
    errorMessage?: string | null;
  }
) => {
  const payload = serializeVisitPayload(visit);
  const { error } = await supabase.from("vendor_sync_logs").insert({
    visit_id: visit.id,
    integration_type: visit.integration_type ?? null,
    integration_webhook: visit.integration_webhook ?? null,
    payload,
    response_status: details.responseStatus ?? null,
    response_body: details.responseBody ?? null,
    status: details.status,
    error_message: details.errorMessage ?? null
  });

  if (error) {
    console.error("[VendorSync] Failed to log sync attempt", error);
  }
};

const updateVisitSyncStatus = async (visitId: string, status: "pending" | "sent" | "failed") => {
  const { error } = await supabase
    .from("vendor_visits")
    .update({ sync_status: status })
    .eq("id", visitId);

  if (error) {
    console.error("[VendorSync] Failed to update sync_status", error);
  }
};

const postToWebhook = async (webhookUrl: string, payload: unknown) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const responseText = await response.text();
    return { response, responseText };
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleInsert = async (event: ChangeEvent<VendorVisitRecord>): Promise<Response> => {
  const visit = event.record;
  if (!visit) {
    return new Response("Missing vendor visit payload", { status: 400 });
  }

  if (visit.integration_type !== "website" || !visit.integration_webhook) {
    await logSyncAttempt(visit, {
      status: "pending",
      responseBody: "No website integration configured"
    });
    return new Response("No integration to process", { status: 200 });
  }

  const payload = {
    visit: serializeVisitPayload(visit)
  };

  try {
    const { response, responseText } = await postToWebhook(visit.integration_webhook, payload);
    const truncatedBody = responseText.slice(0, 4000);

    const logStatus = response.ok ? "success" : "failed";
    await logSyncAttempt(visit, {
      status: logStatus,
      responseStatus: response.status,
      responseBody: truncatedBody,
      errorMessage: response.ok ? null : `Webhook responded with ${response.status}`
    });

    await updateVisitSyncStatus(visit.id, response.ok ? "sent" : "failed");

    if (!response.ok) {
      return new Response(`Vendor webhook responded with ${response.status}`, { status: 502 });
    }

    return new Response("Vendor webhook delivered", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logSyncAttempt(visit, {
      status: "failed",
      errorMessage: message
    });
    await updateVisitSyncStatus(visit.id, "failed");
    console.error("[VendorSync] Failed to deliver webhook", error);
    return new Response("Failed to deliver vendor webhook", { status: 500 });
  }
};

const httpHandler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: ChangeEvent<VendorVisitRecord>;
  try {
    payload = await req.json();
  } catch (_error) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "vendor_visits") {
    return new Response("Event ignored", { status: 200 });
  }

  try {
    return await handleInsert(payload);
  } catch (error) {
    console.error("[VendorSync] Unexpected failure", error);
    return new Response("Internal error", { status: 500 });
  }
};

const functionsClient = (supabase as any).functions;
if (typeof functionsClient?.on === "function") {
  functionsClient.on("INSERT", { schema: "public", table: "vendor_visits" }, handleInsert);
}

serve(httpHandler);
