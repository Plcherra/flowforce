import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { EMPLOYEE_FILES_BUCKET } from "./constants";
import { onboardingFailure, type OnboardingActionResult } from "./failure";
import { acceptedOnboardingFile, employeeFilePath } from "./model";
import { removePrivateOnboardingFile, uploadPrivateOnboardingFile } from "./storage";

export async function acknowledgeOnboardingStep(progressId: string, userId: string): Promise<OnboardingActionResult> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("employee_onboarding_progress")
    .update({
      status: "done",
      acknowledged_at: now,
      completed_at: now,
    })
    .eq("id", progressId)
    .eq("profile_id", userId);
  if (error) return onboardingFailure(error);
  return { ok: true };
}

export async function uploadOnboardingRequirement(input: {
  companyId: string;
  profileId: string;
  progressId: string;
  file: File;
}): Promise<OnboardingActionResult> {
  if (!acceptedOnboardingFile(input.file)) return { ok: false, reason: "type" };
  const path = employeeFilePath(input.companyId, input.profileId, input.progressId, input.file.name);
  try {
    await uploadPrivateOnboardingFile(EMPLOYEE_FILES_BUCKET, path, input.file);
  } catch (error) {
    return onboardingFailure(error);
  }

  const now = new Date().toISOString();
  const { error } = await db
    .from("employee_onboarding_progress")
    .update({
      status: "done",
      storage_path: path,
      file_name: input.file.name,
      mime_type: input.file.type,
      byte_size: input.file.size,
      completed_at: now,
    })
    .eq("id", input.progressId)
    .eq("profile_id", input.profileId);

  if (error) {
    await removePrivateOnboardingFile(EMPLOYEE_FILES_BUCKET, path);
    return onboardingFailure(error);
  }
  return { ok: true };
}

export async function completeOnboarding(enrollmentId: string, userId: string): Promise<OnboardingActionResult> {
  const { error } = await db
    .from("employee_onboarding_enrollments")
    .update({ status: "complete" })
    .eq("id", enrollmentId)
    .eq("profile_id", userId);
  if (error) return onboardingFailure(error);
  return { ok: true };
}
