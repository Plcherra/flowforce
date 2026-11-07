import {
  readHireDate,
  resolveInviteDepartmentId,
  type InviteDepartmentDecision,
} from "@/features/employees/utils/inviteDepartment";
import { supabaseAdmin } from "./supabaseAdmin"; // pragma: allowlist secret

export async function decideInviteDepartment(params: {
  companyId: string;
  requestedId: string | null;
}): Promise<InviteDepartmentDecision> {
  const { data, error } = await supabaseAdmin // pragma: allowlist secret
    .from("departments")
    .select("id")
    .eq("company_id", params.companyId);
  if (error) throw error;
  return resolveInviteDepartmentId({
    requestedId: params.requestedId,
    departmentIds: (data ?? [])
      .map((row) => (typeof row.id === "string" ? row.id : ""))
      .filter((id) => id.length > 0),
  });
}

export async function writeProfileHireDate(userId: string, hireDate: string) {
  const date = readHireDate(hireDate);
  if (!date) return;
  const { error } = await supabaseAdmin // pragma: allowlist secret
    .from("profiles")
    .update({ hire_date: date })
    .eq("id", userId);
  if (error) throw error;
}

export async function copyInviteHireDate(params: {
  inviteId: string;
  userId: string;
}) {
  const { data, error } = await supabaseAdmin // pragma: allowlist secret
    .from("company_invites")
    .select("hire_date")
    .eq("id", params.inviteId)
    .maybeSingle();
  if (error) throw error;
  const hireDate = readHireDate(
    data && typeof data === "object" ? (data as { hire_date?: unknown }).hire_date : null,
  );
  if (!hireDate) return;
  await writeProfileHireDate(params.userId, hireDate);
}
