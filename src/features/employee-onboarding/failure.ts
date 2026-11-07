import {
  getUnknownErrorMessage,
  isMissingTableError,
} from "@/shared/utils/supabaseErrors"; // pragma: allowlist secret

export type OnboardingFailureReason =
  | "missing"
  | "file"
  | "confirm"
  | "incomplete"
  | "type"
  | "generic";

export type OnboardingActionResult =
  | { ok: true }
  | { ok: false; reason: OnboardingFailureReason };

export function onboardingFailure(error: unknown): OnboardingActionResult {
  if (isMissingTableError(error, ["employee_onboarding"])) {
    return { ok: false, reason: "missing" };
  }
  const message = getUnknownErrorMessage(error).toLowerCase();
  if (message.includes("requires a file") || message.includes("bucket")) {
    return { ok: false, reason: "file" };
  }
  if (message.includes("requires confirmation")) {
    return { ok: false, reason: "confirm" };
  }
  if (message.includes("still open")) {
    return { ok: false, reason: "incomplete" };
  }
  return { ok: false, reason: "generic" };
}

export function missingOnboardingTable(error: unknown) {
  return isMissingTableError(error, ["employee_onboarding"]);
}
