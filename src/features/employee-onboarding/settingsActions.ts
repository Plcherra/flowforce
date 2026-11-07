import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { COMPANY_DOCS_BUCKET } from "./constants";
import { onboardingFailure, type OnboardingActionResult } from "./failure";
import { acceptedOnboardingFile, companyDocumentPath } from "./model";
import { removePrivateOnboardingFile, uploadPrivateOnboardingFile } from "./storage";
import type { OnboardingStepKind } from "./types";

export async function saveOnboardingWelcome(input: {
  companyId: string;
  userId: string;
  title: string;
  body: string;
}): Promise<OnboardingActionResult> {
  const { error } = await db.from("employee_onboarding_settings").upsert(
    {
      company_id: input.companyId,
      welcome_title: input.title.trim(),
      welcome_body: input.body.trim(),
      updated_by: input.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );
  if (error) return onboardingFailure(error);
  return { ok: true };
}

export async function uploadShopDocument(input: {
  companyId: string;
  userId: string;
  title: string;
  file: File;
}): Promise<OnboardingActionResult> {
  if (!acceptedOnboardingFile(input.file)) return { ok: false, reason: "type" };
  const id = crypto.randomUUID();
  const path = companyDocumentPath(input.companyId, id, input.file.name);
  try {
    await uploadPrivateOnboardingFile(COMPANY_DOCS_BUCKET, path, input.file);
  } catch (error) {
    return onboardingFailure(error);
  }
  const { error } = await db.from("employee_onboarding_documents").insert({
    id,
    company_id: input.companyId,
    title: input.title.trim(),
    storage_path: path,
    file_name: input.file.name,
    mime_type: input.file.type,
    byte_size: input.file.size,
    uploaded_by: input.userId,
  });
  if (error) {
    await removePrivateOnboardingFile(COMPANY_DOCS_BUCKET, path);
    return onboardingFailure(error);
  }
  return { ok: true };
}

export async function archiveShopDocument(id: string, companyId: string): Promise<OnboardingActionResult> {
  const { error } = await db
    .from("employee_onboarding_documents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return onboardingFailure(error);
  return { ok: true };
}

export async function createOnboardingStep(input: {
  companyId: string;
  userId: string;
  title: string;
  body: string;
  kind: OnboardingStepKind;
  required: boolean;
  documentId: string | null;
  sortOrder: number;
}): Promise<OnboardingActionResult> {
  const { data, error } = await db
    .from("employee_onboarding_steps")
    .insert({
      company_id: input.companyId,
      title: input.title.trim(),
      body: input.body.trim(),
      kind: input.kind,
      required: input.required,
      document_id: input.documentId,
      sort_order: input.sortOrder,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error || !data) return onboardingFailure(error ?? new Error("step"));

  const { data: enrollments } = await db
    .from("employee_onboarding_enrollments")
    .select("id, profile_id")
    .eq("company_id", input.companyId)
    .eq("status", "active");
  if (enrollments && enrollments.length > 0) {
    await db.from("employee_onboarding_progress").insert(
      enrollments.map((enrollment) => ({
        company_id: input.companyId,
        enrollment_id: enrollment.id,
        step_id: data.id,
        profile_id: enrollment.profile_id,
        status: "pending",
      })),
    );
  }
  return { ok: true };
}

export async function updateOnboardingStep(input: {
  id: string;
  companyId: string;
  title: string;
  body: string;
  required: boolean;
  documentId: string | null;
  sortOrder: number;
}): Promise<OnboardingActionResult> {
  const { error } = await db
    .from("employee_onboarding_steps")
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      required: input.required,
      document_id: input.documentId,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", input.companyId);
  if (error) return onboardingFailure(error);
  return { ok: true };
}

export async function archiveOnboardingStep(id: string, companyId: string): Promise<OnboardingActionResult> {
  const { error } = await db
    .from("employee_onboarding_steps")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return onboardingFailure(error);
  return { ok: true };
}
