import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { missingOnboardingTable } from "./failure";
import { startDateIso } from "./model";
import { documentFromRow, stepViews, text, type LooseRow } from "./rows";
import type { EmployeeOnboardingState } from "./types";

async function nameById(table: "departments" | "stores" | "company_roles" | "companies", id: string | null) {
  if (!id) return "";
  const { data, error } = await db.from(table).select("name").eq("id", id).maybeSingle();
  if (error || !data) return "";
  return text(data as LooseRow, "name");
}

export async function loadEmployeeOnboarding(userId: string): Promise<EmployeeOnboardingState> {
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, company_id, role, role_id, department_id, store_id, hire_date")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return { kind: "error" };
  if (!profile?.company_id) return { kind: "none" };

  const companyId = profile.company_id as string;
  const { data: enrollment, error: enrollmentError } = await db
    .from("employee_onboarding_enrollments")
    .select("id, status, started_at")
    .eq("company_id", companyId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (enrollmentError) {
    return missingOnboardingTable(enrollmentError) ? { kind: "missing" } : { kind: "error" };
  }
  if (!enrollment) return { kind: "none" };

  const [settingsResult, stepsResult, documentsResult, progressResult, companyName, roleName, departmentName, storeName] =
    await Promise.all([
      db
        .from("employee_onboarding_settings")
        .select("welcome_title, welcome_body")
        .eq("company_id", companyId)
        .maybeSingle(),
      db
        .from("employee_onboarding_steps")
        .select("id, title, body, kind, required, sort_order, document_id, archived_at")
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true }),
      db
        .from("employee_onboarding_documents")
        .select("id, title, storage_path, file_name, archived_at")
        .eq("company_id", companyId),
      db
        .from("employee_onboarding_progress")
        .select("id, step_id, status, file_name, storage_path")
        .eq("enrollment_id", enrollment.id),
      nameById("companies", companyId),
      nameById("company_roles", (profile.role_id as string | null) ?? null),
      nameById("departments", (profile.department_id as string | null) ?? null),
      nameById("stores", (profile.store_id as string | null) ?? null),
    ]);

  const failed = [settingsResult.error, stepsResult.error, documentsResult.error, progressResult.error].find(Boolean);
  if (failed) {
    return missingOnboardingTable(failed) ? { kind: "missing" } : { kind: "error" };
  }

  const documents = ((documentsResult.data ?? []) as LooseRow[]).map(documentFromRow);
  let progress = (progressResult.data ?? []) as LooseRow[];
  const stepRows = (stepsResult.data ?? []) as LooseRow[];
  const missingSteps = stepRows.filter((step) => {
    if (step.archived_at) return false;
    return !progress.some((row) => row.step_id === step.id);
  });

  if (missingSteps.length > 0 && enrollment.status === "active") {
    const { data: inserted, error: insertError } = await db
      .from("employee_onboarding_progress")
      .insert(
        missingSteps.map((step) => ({
          company_id: companyId,
          enrollment_id: enrollment.id,
          step_id: step.id,
          profile_id: userId,
          status: "pending",
        })),
      )
      .select("id, step_id, status, file_name, storage_path");
    if (!insertError && inserted) {
      progress = progress.concat(inserted as LooseRow[]);
    }
  }

  const settings = (settingsResult.data ?? null) as LooseRow | null;
  return {
    kind: "ready",
    enrollmentId: enrollment.id as string,
    companyId,
    status: enrollment.status === "complete" ? "complete" : "active",
    companyName,
    welcomeTitle: settings ? text(settings, "welcome_title") : "",
    welcomeBody: settings ? text(settings, "welcome_body") : "",
    facts: {
      role: roleName || text(profile as LooseRow, "role"),
      department: departmentName,
      store: storeName,
      startDate: startDateIso(
        (profile.hire_date as string | null) ?? null,
        (enrollment.started_at as string) ?? new Date().toISOString(),
      ),
    },
    steps: stepViews({ steps: stepRows, progress, documents }),
  };
}
