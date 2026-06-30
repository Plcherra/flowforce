import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, api_key, content-type",
};

const TRAINING_ADMIN_ROLES = new Set(["manager", "admin", "company_admin", "owner"]);
const DEFAULT_EVENT_LIMIT = 25;
const DEFAULT_SNAPSHOT_LIMIT = 10;

const requestSchema = z.object({
  enrollmentId: z.string(),
  eventCursor: z.string().optional(),
  snapshotCursor: z.string().optional(),
  eventLimit: z.number().int().min(5).max(100).optional(),
  snapshotLimit: z.number().int().min(5).max(100).optional(),
});

const numericLike = z.union([z.number(), z.string()]).nullable().optional();

const eventRowSchema = z.object({
  id: z.string(),
  enrollment_id: z.string(),
  module_id: z.string().nullable(),
  event_type: z.string(),
  delta_progress: numericLike,
  delta_hours: numericLike,
  note: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
});

const snapshotRowSchema = z.object({
  id: z.string(),
  enrollment_id: z.string(),
  module_id: z.string().nullable(),
  progress_percent: z.number(),
  time_spent_minutes: z.number(),
  quiz_score: z.number().nullable(),
  ai_recommendation: z.string().nullable(),
  recorded_at: z.string(),
  recorded_by: z.string().nullable(),
  metadata: z.unknown().nullable(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function assertAuthHeader(req: Request) {
  const header = req.headers.get("Authorization");
  if (!header) {
    throw Object.assign(new Error("Missing Authorization header"), { status: 401 });
  }
  return header;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = assertAuthHeader(req);
    const supabase = createClient(assertEnv("SUPABASE_URL", SUPABASE_URL), assertEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY), {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult?.user) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }

    const payload = requestSchema.parse(await req.json());
    const { enrollmentId } = payload;
    const eventLimit = payload.eventLimit ?? DEFAULT_EVENT_LIMIT;
    const snapshotLimit = payload.snapshotLimit ?? DEFAULT_SNAPSHOT_LIMIT;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, company_id")
      .eq("id", userResult.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to load profile: ${profileError.message}`);
    }
    if (!profile) {
      throw Object.assign(new Error("Profile not found"), { status: 404 });
    }

    const { data: enrollmentRow, error: enrollmentError } = await supabase
      .from("learning_enrollments")
      .select("employee_id, company_id")
      .eq("id", enrollmentId)
      .maybeSingle();

    if (enrollmentError) {
      throw new Error(`Failed to load enrollment: ${enrollmentError.message}`);
    }
    if (!enrollmentRow) {
      throw Object.assign(new Error("Enrollment not found"), { status: 404 });
    }

    const isAdmin = TRAINING_ADMIN_ROLES.has(profile.role);
    if (!isAdmin) {
      if (enrollmentRow.employee_id !== profile.id) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
      }
    }
    if (profile.company_id !== enrollmentRow.company_id) {
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    }

    const { eventPage, eventCursor } = await fetchEventsPage(supabase, enrollmentId, eventLimit, payload.eventCursor);
    const { snapshotPage, snapshotCursor } = await fetchSnapshotsPage(supabase, enrollmentId, snapshotLimit, payload.snapshotCursor);

    return new Response(
      JSON.stringify({
        events: eventPage,
        eventCursor,
        snapshots: snapshotPage,
        snapshotCursor,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("learning-progress-history error:", error);
    const status = (error as { status?: number }).status ?? 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchEventsPage(
  client: ReturnType<typeof createClient>,
  enrollmentId: string,
  limit: number,
  cursor?: string,
) {
  let query = client
    .from("learning_progress_events")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load progress events: ${error.message}`);
  }

  const events = z.array(eventRowSchema).parse(data ?? []);
  let nextCursor: string | null = null;
  let trimmed = events;
  if (events.length > limit) {
    trimmed = events.slice(0, limit);
    nextCursor = events[limit - 1].created_at;
  } else if (events.length === limit) {
    nextCursor = events[events.length - 1].created_at;
  }

  return { eventPage: trimmed, eventCursor: nextCursor };
}

async function fetchSnapshotsPage(
  client: ReturnType<typeof createClient>,
  enrollmentId: string,
  limit: number,
  cursor?: string,
) {
  let query = client
    .from("learning_progress")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("recorded_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("recorded_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load progress snapshots: ${error.message}`);
  }

  const snapshots = z.array(snapshotRowSchema).parse(data ?? []);
  let nextCursor: string | null = null;
  let trimmed = snapshots;
  if (snapshots.length > limit) {
    trimmed = snapshots.slice(0, limit);
    nextCursor = snapshots[limit - 1].recorded_at;
  } else if (snapshots.length === limit) {
    nextCursor = snapshots[snapshots.length - 1].recorded_at;
  }

  return { snapshotPage: trimmed, snapshotCursor: nextCursor };
}
