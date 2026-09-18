import { supabase } from "@/integrations/supabase/client";

export async function acceptCompanyInvite(inviteToken: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return false;

  const response = await fetch("/api/employees/invite/accept", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inviteToken }),
  });

  return response.ok;
}
