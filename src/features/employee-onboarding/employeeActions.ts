import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { EMPLOYEE_FILES_BUCKET } from "./constants";
import { onboardingFailure, type OnboardingActionResult } from "./failure";
import { openRequiredHiringBlocks } from "./hiringModel";
import { loadHiringBlocks } from "./hiringStore";
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

export async function completeOnboarding(input: {
  enrollmentId: string;
  userId: string;
  companyId: string;
}): Promise<OnboardingActionResult> {
  const blocks = await loadHiringBlocks(input.companyId);
  if (blocks && blocks.length > 0) {
    const { data, error: responseError } = await db
      .from("hiring_responses")
      .select("block_id, text_value, bool_value, date_value, file_name, status")
      .eq("profile_id", input.userId)
      .eq("company_id", input.companyId);
    if (responseError) return onboardingFailure(responseError);
    const answers: Record<string, { blockId: string; textValue: string; boolValue: boolean | null; dateValue: string | null; fileName: string | null; done: boolean; verified: boolean }> = {};
    for (const row of data ?? []) {
      const record = row as Record<string, unknown>;
      const blockId = String(record.block_id ?? "");
      answers[blockId] = {
        blockId,
        textValue: typeof record.text_value === "string" ? record.text_value : "",
        boolValue: typeof record.bool_value === "boolean" ? record.bool_value : null,
        dateValue: typeof record.date_value === "string" ? record.date_value : null,
        fileName: typeof record.file_name === "string" ? record.file_name : null,
        done: record.status === "done" || record.status === "verified",
        verified: record.status === "verified",
      };
    }
    if (openRequiredHiringBlocks(blocks, answers).length > 0) {
      return { ok: false, reason: "incomplete" };
    }
  }

  const { error } = await db
    .from("employee_onboarding_enrollments")
    .update({ status: "complete" })
    .eq("id", input.enrollmentId)
    .eq("profile_id", input.userId);
  if (error) return onboardingFailure(error);
  return { ok: true };
}
