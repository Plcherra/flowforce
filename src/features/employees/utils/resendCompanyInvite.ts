import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret

export async function resendCompanyInvite(email: string) {
  const { data: sessionData } = await supabase.auth.getSession(); // pragma: allowlist secret
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false as const };
  const response = await fetch("/api/employees/invite/resend", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  return { ok: response.ok as boolean };
}
