import { supabase } from "@/integrations/supabase/client";
import type { PermissionDiffMap } from "@/features/roles/constants/personAccessDiffs";

export type CompanyInvitePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleId: string;
  permissionOverrides?: PermissionDiffMap;
  locationId?: string;
  departmentId?: string;
};

export type CompanyInviteResult = {
  ok: boolean;
  email: string | null;
  inviteId?: string;
  inviteToken?: string;
  inviteLink?: string;
  emailed?: boolean;
  message?: string;
};

export async function sendCompanyInvites(invites: CompanyInvitePayload[]) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const response = await fetch("/api/employees/invite", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invites: invites.map((invite) => ({
        firstName: invite.firstName,
        lastName: invite.lastName,
        email: invite.email || undefined,
        phone: invite.phone || undefined,
        roleId: invite.roleId,
        permissionOverrides: invite.permissionOverrides ?? {},
        departmentId: invite.departmentId || undefined,
      })),
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    message?: string;
    details?: { message?: string } | string;
    inviteId?: string;
    inviteToken?: string;
    inviteLink?: string;
    results?: CompanyInviteResult[];
  };

  if (!response.ok) {
    const detailMessage =
      typeof result.details === "string"
        ? result.details
        : result.details?.message;
    throw new Error(
      [result.message, detailMessage].filter(Boolean).join(": ") ||
        "Failed to send invitation",
    );
  }

  return {
    inviteId: result.inviteId ?? null,
    inviteToken: result.inviteToken ?? null,
    inviteLink: result.inviteLink ?? null,
    results: result.results ?? [],
  };
}
