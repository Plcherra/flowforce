import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret

export const HIRE_ACTIVITY_ACTIONS = [
  "hire.activated",
  "hire.step_completed",
  "hire.file_submitted",
  "hire.onboarding_finished",
] as const;

export type HireActivityAction = (typeof HIRE_ACTIVITY_ACTIONS)[number];

export async function logHireActivity(input: {
  profileId: string;
  action: HireActivityAction;
  step?: string;
}) {
  const step = input.step?.trim() || null;
  const { error } = await db.rpc("log_audit_event", {
    target_user_id: input.profileId,
    event_action: input.action,
    target_table: "profiles",
    target_record_id: input.profileId,
    next_values: step ? { step } : {},
  });
  if (error) return false;
  return true;
}

export function hireActivityKey(action: string) {
  if (action === "hire.activated") return "hireActivity.activated";
  if (action === "hire.step_completed") return "hireActivity.completedStep";
  if (action === "hire.file_submitted") return "hireActivity.submittedFile";
  if (action === "hire.onboarding_finished") return "hireActivity.finished";
  return null;
}
