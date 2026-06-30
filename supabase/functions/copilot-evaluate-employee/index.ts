import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import dayjs from "https://esm.sh/dayjs@1.11.11";
import { evaluateEmployeeContext } from "../../../src/server/copilot/evaluator.ts";
import type {
  EmployeeContext,
  EmployeeReport,
  SkillMatrixEntry,
  StaffPerformanceEntry,
  CertificationSummary,
} from "../../../src/server/copilot/evaluator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, api_key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const privilegedRoles = new Set([
  "owner",
  "admin",
  "manager",
  "hr",
  "people_ops",
  "people-ops",
  "peopleops",
  "supervisor",
]);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new HttpError(500, "Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userResult?.user) {
      throw new HttpError(401, "Invalid or expired session");
    }

    const requesterId = userResult.user.id;
    const payload = await req.json();
    const employeeId = payload?.employeeId;

    if (!employeeId || typeof employeeId !== "string") {
      throw new HttpError(400, "employeeId is required");
    }

    const [
      { data: requesterProfile, error: requesterError },
      { data: employeeProfile, error: employeeError },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, role, company_id")
        .eq("id", requesterId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("id, role, first_name, last_name, company_id")
        .eq("id", employeeId)
        .maybeSingle(),
    ]);

    if (requesterError) {
      throw new HttpError(500, `Failed to load requester profile: ${requesterError.message}`);
    }
    if (!requesterProfile) {
      throw new HttpError(403, "Requester profile not found");
    }
    if (employeeError) {
      throw new HttpError(500, `Failed to load employee profile: ${employeeError.message}`);
    }
    if (!employeeProfile) {
      throw new HttpError(404, "Employee not found");
    }

    const requesterRole = requesterProfile.role?.toLowerCase() ?? "";
    const sameCompany =
      requesterProfile.company_id && requesterProfile.company_id === employeeProfile.company_id;
    const isSelf = requesterProfile.id === employeeId;
    const hasPrivilegedRole = privilegedRoles.has(requesterRole);

    if (!isSelf && !(sameCompany && hasPrivilegedRole)) {
      throw new HttpError(403, "You do not have permission to evaluate this employee");
    }

    const now = new Date();
    const nowDayjs = dayjs(now);

    const [
      reportsResult,
      skillsResult,
      performanceResult,
      certificationResult,
      badgeResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("employee_report")
        .select(
          "id, employee_id, date, category, severity, notes, created_by, created_at, updated_at",
        )
        .eq("employee_id", employeeId)
        .gte("date", nowDayjs.subtract(120, "day").format("YYYY-MM-DD")),
      supabaseAdmin
        .from("skill_matrix")
        .select("id, employee_id, role, level, xp, last_review, created_at, updated_at")
        .eq("employee_id", employeeId),
      supabaseAdmin
        .from("staff_performance")
        .select("date, attendance_status, role, hours_worked")
        .eq("user_id", employeeId)
        .gte("date", nowDayjs.subtract(120, "day").format("YYYY-MM-DD")),
      supabaseAdmin
        .from("certification_progress")
        .select(
          "certification_code, status, achieved_at, certification:certification_catalog(badge_code, title)",
        )
        .eq("employee_id", employeeId),
      supabaseAdmin
        .from("employee_badge")
        .select("badge_code")
        .eq("employee_id", employeeId),
    ]);

    if (reportsResult.error) throw new HttpError(500, reportsResult.error.message);
    if (skillsResult.error) throw new HttpError(500, skillsResult.error.message);
    if (performanceResult.error) throw new HttpError(500, performanceResult.error.message);
    if (certificationResult.error) throw new HttpError(500, certificationResult.error.message);
    if (badgeResult.error) throw new HttpError(500, badgeResult.error.message);

    const context: EmployeeContext = {
      profile: {
        id: employeeProfile.id,
        role: employeeProfile.role,
        firstName: employeeProfile.first_name,
        lastName: employeeProfile.last_name,
      },
      reports: (reportsResult.data ?? []).map(mapReport),
      skills: (skillsResult.data ?? []).map(mapSkill),
      performance: (performanceResult.data ?? []).map(mapPerformance),
      certifications: (certificationResult.data ?? []).map(mapCertification),
      awardedBadges: (badgeResult.data ?? []).map((row: { badge_code: string }) => row.badge_code),
    };

    const decision = evaluateEmployeeContext(context, now);

    return new Response(JSON.stringify({ decision }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unhandled error";
    console.error("[copilot-evaluate-employee] error", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const mapReport = (row: any): EmployeeReport => ({
  id: row.id,
  employeeId: row.employee_id,
  date: row.date,
  category: row.category,
  severity: row.severity,
  notes: row.notes ?? null,
  createdBy: row.created_by,
  createdAt: row.created_at ?? "",
  updatedAt: row.updated_at ?? "",
});

const mapSkill = (row: any): SkillMatrixEntry => ({
  id: row.id,
  employeeId: row.employee_id,
  role: row.role,
  level: row.level,
  xp: row.xp,
  lastReview: row.last_review ?? null,
  createdAt: row.created_at ?? "",
  updatedAt: row.updated_at ?? "",
});

const mapPerformance = (row: any): StaffPerformanceEntry => ({
  date: row.date,
  attendanceStatus: row.attendance_status,
  role: row.role,
  hoursWorked: row.hours_worked ?? null,
});

const mapCertification = (row: any): CertificationSummary => ({
  code: row.certification_code,
  status: row.status,
  achievedAt: row.achieved_at ?? null,
  badgeCode: row.certification?.badge_code ?? null,
  title: row.certification?.title ?? null,
});
