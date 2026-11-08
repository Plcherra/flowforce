import { isMissingTableError } from "@/shared/utils/supabaseErrors"; // pragma: allowlist secret
import { createServerLogger } from "./utils/logger";
import { supabaseAdmin as admin } from "./supabaseAdmin"; // pragma: allowlist secret

const logger = createServerLogger("employee-onboarding-enroll");

export async function enrollEmployeeOnboarding(params: { inviteId: string; userId: string }) {
  try {
    const { data: invite, error: inviteError } = await admin
      .from("company_invites")
      .select("id, company_id")
      .eq("id", params.inviteId)
      .maybeSingle();
    if (inviteError || !invite?.company_id) return;

    const { data: existing, error: existingError } = await admin
      .from("employee_onboarding_enrollments")
      .select("id")
      .eq("company_id", invite.company_id)
      .eq("profile_id", params.userId)
      .maybeSingle();
    if (existingError) {
      if (isMissingTableError(existingError, ["employee_onboarding_enrollments"])) return;
      throw existingError;
    }
    await admin.from("audit_log").insert({
      company_id: invite.company_id,
      actor_id: params.userId,
      target_user_id: params.userId,
      action: "hire.activated",
      table_name: "profiles",
      record_id: params.userId,
      new_values: {},
      metadata: {},
    });
    if (existing) return;

    const { data: created, error: createError } = await admin
      .from("employee_onboarding_enrollments")
      .insert({
        company_id: invite.company_id,
        profile_id: params.userId,
        invite_id: invite.id,
        status: "active",
      })
      .select("id")
      .single();
    if (createError || !created) {
      if (isMissingTableError(createError, ["employee_onboarding_enrollments"])) return;
      throw createError ?? new Error("enrollment");
    }

    const { data: steps, error: stepsError } = await admin
      .from("employee_onboarding_steps")
      .select("id")
      .eq("company_id", invite.company_id)
      .is("archived_at", null);
    if (stepsError) throw stepsError;
    if (!steps || steps.length === 0) return;

    const { error: progressError } = await admin.from("employee_onboarding_progress").insert(
      steps.map((step) => ({
        company_id: invite.company_id,
        enrollment_id: created.id,
        step_id: step.id,
        profile_id: params.userId,
        status: "pending",
      })),
    );
    if (progressError) throw progressError;
  } catch (error) {
    logger.warn("Onboarding enrollment skipped", { error });
  }
}
