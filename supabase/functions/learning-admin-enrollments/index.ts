import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, api_key, content-type",
};

const TRAINING_ADMIN_ROLES = new Set(["manager", "admin", "company_admin", "owner"]);

const requestSchema = z
  .object({
    limit: z.number().int().min(1).max(500).optional(),
  })
  .optional();

const enrollmentRowSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  employee_id: z.string(),
  company_id: z.string().nullable(),
  status: z.string(),
  progress_percent: z.union([z.number(), z.string()]).nullable(),
  hours_completed: z.union([z.number(), z.string()]).nullable(),
  current_module: z.number().nullable(),
  level: z.number().nullable(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  last_activity_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type SupabaseClient = ReturnType<typeof createClient>;

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

async function getProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("company_id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }
  if (!data?.company_id || !data.role) {
    throw Object.assign(new Error("Profile missing company or role"), { status: 403 });
  }
  if (!TRAINING_ADMIN_ROLES.has(data.role)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return data;
}

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (value == null) return fallback;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

function mapEnrollment(row: z.infer<typeof enrollmentRowSchema>) {
  return {
    id: row.id,
    courseId: row.course_id,
    employeeId: row.employee_id,
    status: row.status ?? "in_progress",
    progressPercent: toNumber(row.progress_percent),
    hoursCompleted: toNumber(row.hours_completed),
    currentModule: row.current_module ?? 0,
    level: row.level ?? 1,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

    const profile = await getProfile(supabase, userResult.user.id);
    const body = req.method === "POST" || req.method === "PUT" ? await req.json().catch(() => ({})) : {};
    const { limit = 200 } = requestSchema.parse(body) ?? {};

    const { data, error } = await supabase
      .from("learning_enrollments")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load enrollments: ${error.message}`);
    }

    const parsedRows = z.array(enrollmentRowSchema).parse(data ?? []);
    const enrollments = parsedRows.map(mapEnrollment);

    return new Response(JSON.stringify({ enrollments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("learning-admin-enrollments error:", error);
    const status = (error as { status?: number }).status ?? 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
