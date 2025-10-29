import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import dayjs from "https://esm.sh/dayjs@1.11.11";
import relativeTime from "https://esm.sh/dayjs@1.11.11/plugin/relativeTime";
import isSameOrAfter from "https://esm.sh/dayjs@1.11.11/plugin/isSameOrAfter";

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POSITIVE_SEVERITY = 4;
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

type BadgeSuggestion = {
  badgeCode: string;
  reason: string;
  confidence: number;
};

type SkillUpdate = {
  role: string;
  deltaXP: number;
  levelUp?: boolean;
  newLevel?: number;
  note?: string;
};

type PromotionSuggestion = {
  role: string;
  level: number;
  rationale: string;
  confidence: number;
};

type CopilotDecision = {
  badges: BadgeSuggestion[];
  skillUpdates: SkillUpdate[];
  promotion?: PromotionSuggestion | null;
  coachingNotes?: string[];
};

type StaffPerformanceEntry = {
  date: string;
  attendanceStatus: string | null;
  role: string | null;
  hoursWorked?: number | null;
};

type CertificationSummary = {
  code: string;
  status: string;
  achievedAt: string | null;
  badgeCode: string | null;
  title: string | null;
};

type EmployeeReport = {
  id: string;
  employeeId: string;
  date: string;
  category: string;
  severity: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type SkillMatrixEntry = {
  id: string;
  employeeId: string;
  role: string;
  level: number;
  xp: number;
  lastReview: string | null;
  createdAt: string;
  updatedAt: string;
};

type EmployeeContext = {
  profile: {
    id: string;
    role: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  reports: EmployeeReport[];
  skills: SkillMatrixEntry[];
  performance: StaffPerformanceEntry[];
  certifications: CertificationSummary[];
  awardedBadges: string[];
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const isWithinDays = (dateISO: string, days: number, now = dayjs()) =>
  dayjs(dateISO).isSameOrAfter(now.subtract(days, "day"), "day");

function evaluateEmployeeContext(context: EmployeeContext, now = dayjs()): CopilotDecision {
  const badges: BadgeSuggestion[] = [];
  const skillUpdates: SkillUpdate[] = [];
  const coachingNotes: string[] = [];
  let promotion: PromotionSuggestion | null = null;

  const { reports, performance, skills, profile, certifications, awardedBadges } = context;

  const positivePerformanceReports = reports.filter(
    (report) =>
      report.category === "performance" &&
      report.severity >= POSITIVE_SEVERITY &&
      isWithinDays(report.date, 30, now),
  );

  const noShowCount = performance.filter(
    (entry) => entry.attendanceStatus === "absent" && isWithinDays(entry.date, 30, now),
  ).length;

  if (positivePerformanceReports.length >= 3 && noShowCount === 0) {
    badges.push({
      badgeCode: "CONSISTENCY_STAR",
      reason: `${positivePerformanceReports.length} positive performance reports in the last month with zero no-shows`,
      confidence: Math.min(1, positivePerformanceReports.length / 5),
    });
  }

  const mentorShiftCount = performance.filter(
    (entry) =>
      entry.role?.toLowerCase().includes("mentor") &&
      entry.attendanceStatus === "present" &&
      isWithinDays(entry.date, 90, now),
  ).length;
  if (mentorShiftCount >= 10) {
    badges.push({
      badgeCode: "MENTOR",
      reason: `Completed ${mentorShiftCount} mentor shifts`,
      confidence: Math.min(1, mentorShiftCount / 12),
    });
  }

  const lateCount14 = performance.filter(
    (entry) => entry.attendanceStatus === "late" && isWithinDays(entry.date, 14, now),
  ).length;
  if (lateCount14 >= 2) {
    skillUpdates.push({
      role: profile.role ?? "general",
      deltaXP: -20,
      note: "Attendance issues: 2+ late arrivals in the last 14 days.",
    });
    coachingNotes.push("Coach employee on punctuality (2+ lates in two weeks).");
  }

  skills.forEach((skill) => {
    const expectedLevel = Math.floor(skill.xp / 100) + 1;
    if (expectedLevel > skill.level) {
      skillUpdates.push({
        role: skill.role,
        deltaXP: 0,
        levelUp: true,
        newLevel: expectedLevel,
        note: `XP ${skill.xp} exceeds threshold for level ${expectedLevel}.`,
      });
    }
  });

  const customerPositive = reports.filter(
    (report) =>
      report.category === "customer" &&
      report.severity >= POSITIVE_SEVERITY &&
      isWithinDays(report.date, 30, now),
  ).length;
  const lateCount30 = performance.filter(
    (entry) => entry.attendanceStatus === "late" && isWithinDays(entry.date, 30, now),
  ).length;

  const reliabilityHigh = noShowCount === 0 && lateCount30 <= 1;

  const promotableSkill = skills.find((skill) => skill.level >= 3);

  if (promotableSkill && promotableSkill.role) {
    const currentRole = promotableSkill.role;
    const proposedRole =
      currentRole.toLowerCase() === "barista" ? "Shift Lead" : `Senior ${currentRole}`;
    if (reliabilityHigh && customerPositive >= 2) {
      promotion = {
        role: proposedRole,
        level: promotableSkill.level + 1,
        rationale: `Strong reliability and customer feedback (≥2 positives). Current level ${promotableSkill.level}.`,
        confidence: 0.75,
      };
    }
  }

  certifications
    .filter(
      (cert) =>
        cert.status === "earned" &&
        cert.badgeCode &&
        !awardedBadges.includes(cert.badgeCode) &&
        !badges.some((suggestion) => suggestion.badgeCode === cert.badgeCode),
    )
    .forEach((cert) => {
      badges.push({
        badgeCode: cert.badgeCode as string,
        reason: `Certification ${cert.title ?? cert.code} completed`,
        confidence: 1,
      });
    });

  return {
    badges,
    skillUpdates,
    promotion,
    coachingNotes: coachingNotes.length > 0 ? coachingNotes : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
    const { employeeId } = await req.json();

    if (!employeeId || typeof employeeId !== "string") {
      throw new HttpError(400, "employeeId is required");
    }

    const [{ data: requesterProfile, error: requesterError }, { data: employeeProfile, error: employeeError }] =
      await Promise.all([
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

    const now = dayjs();
    const [reportsResult, skillsResult, performanceResult, certificationResult, badgeResult] =
      await Promise.all([
        supabaseAdmin
          .from("employee_report")
          .select(
            "id, employee_id, date, category, severity, notes, created_by, created_at, updated_at",
          )
          .eq("employee_id", employeeId)
          .gte("date", now.subtract(120, "day").format("YYYY-MM-DD")),
        supabaseAdmin
          .from("skill_matrix")
          .select("id, employee_id, role, level, xp, last_review, created_at, updated_at")
          .eq("employee_id", employeeId),
        supabaseAdmin
          .from("staff_performance")
          .select("date, attendance_status, role, hours_worked")
          .eq("user_id", employeeId)
          .gte("date", now.subtract(120, "day").format("YYYY-MM-DD")),
        supabaseAdmin
          .from("certification_progress")
          .select("certification_code, status, achieved_at, certification:certification_catalog(badge_code, title)")
          .eq("employee_id", employeeId),
        supabaseAdmin
          .from("employee_badge")
          .select("badge_code")
          .eq("employee_id", employeeId),
      ]);

    if (reportsResult.error) {
      throw new HttpError(500, reportsResult.error.message);
    }
    if (skillsResult.error) {
      throw new HttpError(500, skillsResult.error.message);
    }
    if (performanceResult.error) {
      throw new HttpError(500, performanceResult.error.message);
    }
    if (certificationResult.error) {
      throw new HttpError(500, certificationResult.error.message);
    }
    if (badgeResult.error) {
      throw new HttpError(500, badgeResult.error.message);
    }

    const context: EmployeeContext = {
      profile: {
        id: employeeProfile.id,
        role: employeeProfile.role,
        firstName: employeeProfile.first_name,
        lastName: employeeProfile.last_name,
      },
      reports: (reportsResult.data ?? []).map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        date: row.date,
        category: row.category,
        severity: row.severity,
        notes: row.notes ?? null,
        createdBy: row.created_by,
        createdAt: row.created_at ?? "",
        updatedAt: row.updated_at ?? "",
      })),
      skills: (skillsResult.data ?? []).map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        role: row.role,
        level: row.level,
        xp: row.xp,
        lastReview: row.last_review ?? null,
        createdAt: row.created_at ?? "",
        updatedAt: row.updated_at ?? "",
      })),
      performance: (performanceResult.data ?? []).map((row) => ({
        date: row.date,
        attendanceStatus: row.attendance_status,
        role: row.role,
        hoursWorked: row.hours_worked ?? null,
      })),
      certifications: (certificationResult.data ?? []).map((row: any) => ({
        code: row.certification_code,
        status: row.status,
        achievedAt: row.achieved_at ?? null,
        badgeCode: row.certification?.badge_code ?? null,
        title: row.certification?.title ?? null,
      })),
      awardedBadges: (badgeResult.data ?? []).map((row) => row.badge_code),
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

