import { supabase } from "@/integrations/supabase/client";
import type { PermissionDiffMap } from "@/features/roles/constants/personAccessDiffs";

export type SaveEmployeeAccessInput = {
  userId: string;
  roleId?: string | null;
  permissionOverrides?: PermissionDiffMap;
};

export async function saveEmployeeAccess(input: SaveEmployeeAccessInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const response = await fetch("/api/employees/access", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: input.userId,
      roleId: input.roleId || undefined,
      permissionOverrides: input.permissionOverrides,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    message?: string;
    roleId?: string;
    role?: string;
  };

  if (!response.ok) {
    throw new Error(result.message || "Failed to save access");
  }

  return result;
}
