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
  startDate?: string;
  firstShift?: { start: string; end: string };
};

export type CompanyInviteResult = {
  ok: boolean;
  email: string | null;
  code?: string;
  inviteId?: string;
  inviteToken?: string;
  inviteLink?: string;
  emailed?: boolean;
  message?: string;
  firstShift?: "saved" | "forbidden" | "skipped" | "failed";
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
        locationId: invite.locationId || undefined,
        startDate: invite.startDate || undefined,
        firstShift: invite.firstShift,
      })),
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
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
    const error = new Error(
      [result.message, detailMessage].filter(Boolean).join(": ") ||
        "Failed to send invitation",
    ) as Error & { code?: string };
    if (result.code) error.code = result.code;
    throw error;
  }

  return {
    inviteId: result.inviteId ?? null,
    inviteToken: result.inviteToken ?? null,
    inviteLink: result.inviteLink ?? null,
    results: result.results ?? [],
  };
}
