import { supabaseAdmin } from "./supabaseAdmin"; // pragma: allowlist secret

export async function sendInviteEmail(input: {
  email: string;
  redirectTo: string;
  firstName: string;
  lastName: string;
  roleKey: string;
  roleId: string;
  roleName: string;
  companyId: string;
  inviteId: string;
  inviteToken: string;
  storeId: string | null;
  startDate: string;
}) {
  const [company, store] = await Promise.all([
    supabaseAdmin.from("companies").select("name").eq("id", input.companyId).maybeSingle(), // pragma: allowlist secret
    input.storeId
      ? supabaseAdmin.from("stores").select("name").eq("id", input.storeId).maybeSingle() // pragma: allowlist secret
      : Promise.resolve({ data: null as { name?: string | null } | null }),
  ]);

  return supabaseAdmin.auth.admin.inviteUserByEmail(input.email, { // pragma: allowlist secret
    redirectTo: input.redirectTo,
    data: {
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.roleKey,
      role_name: input.roleName,
      role_id: input.roleId,
      company_id: input.companyId,
      company_name: company.data?.name ?? "",
      store_name: store.data?.name ?? "",
      start_date: input.startDate,
      invite_id: input.inviteId,
      invite_token: input.inviteToken,
    },
  });
}
