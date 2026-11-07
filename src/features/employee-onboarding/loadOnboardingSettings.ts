import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { missingOnboardingTable } from "./failure";
import { documentFromRow, stepViews, text, type LooseRow } from "./rows";
import type { OnboardingSettingsState, OnboardingSubmission } from "./types";

export type SettingsLoad =
  | { kind: "missing" }
  | { kind: "error" }
  | { kind: "ready"; settings: OnboardingSettingsState };

export async function loadOnboardingSettings(companyId: string): Promise<SettingsLoad> {
  const [settingsResult, documentsResult, stepsResult, progressResult] = await Promise.all([
    db
      .from("employee_onboarding_settings")
      .select("welcome_title, welcome_body")
      .eq("company_id", companyId)
      .maybeSingle(),
    db
      .from("employee_onboarding_documents")
      .select("id, title, storage_path, file_name, archived_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    db
      .from("employee_onboarding_steps")
      .select("id, title, body, kind, required, sort_order, document_id, archived_at")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true }),
    db
      .from("employee_onboarding_progress")
      .select("id, file_name, storage_path, profile_id, step_id, completed_at")
      .eq("company_id", companyId)
      .not("storage_path", "is", null),
  ]);

  const failed = [settingsResult.error, documentsResult.error, stepsResult.error, progressResult.error].find(Boolean);
  if (failed) return missingOnboardingTable(failed) ? { kind: "missing" } : { kind: "error" };

  const documents = ((documentsResult.data ?? []) as LooseRow[]).map(documentFromRow);
  const submissions = await submissionViews((progressResult.data ?? []) as LooseRow[], companyId);
  const settings = (settingsResult.data ?? null) as LooseRow | null;
  return {
    kind: "ready",
    settings: {
      welcomeTitle: settings ? text(settings, "welcome_title") : "",
      welcomeBody: settings ? text(settings, "welcome_body") : "",
      documents,
      steps: stepViews({
        steps: (stepsResult.data ?? []) as LooseRow[],
        progress: [],
        documents,
      }),
      submissions,
    },
  };
}

async function submissionViews(rows: LooseRow[], companyId: string): Promise<OnboardingSubmission[]> {
  const profileIds = [...new Set(rows.map((row) => text(row, "profile_id")).filter(Boolean))];
  const stepIds = [...new Set(rows.map((row) => text(row, "step_id")).filter(Boolean))];
  const [peopleResult, stepsResult] = await Promise.all([
    profileIds.length
      ? db.from("profiles").select("id, first_name, last_name").in("id", profileIds).eq("company_id", companyId)
      : Promise.resolve({ data: [] }),
    stepIds.length
      ? db.from("employee_onboarding_steps").select("id, title").in("id", stepIds)
      : Promise.resolve({ data: [] }),
  ]);
  const people = new Map(
    ((peopleResult.data ?? []) as LooseRow[]).map((row) => [
      text(row, "id"),
      [text(row, "first_name"), text(row, "last_name")].filter(Boolean).join(" "),
    ]),
  );
  const titles = new Map(((stepsResult.data ?? []) as LooseRow[]).map((row) => [text(row, "id"), text(row, "title")]));
  return rows
    .filter((row) => text(row, "storage_path"))
    .map((row) => ({
      id: text(row, "id"),
      fileName: text(row, "file_name"),
      storagePath: text(row, "storage_path"),
      personName: people.get(text(row, "profile_id")) || "",
      stepTitle: titles.get(text(row, "step_id")) || "",
      completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    }));
}
