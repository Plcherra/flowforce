import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import type { OptionalPackId, PackFlags } from "@/config/packFlags";

type ApiErrorBody = {
  message?: string;
  code?: string;
};

export class PackCheckoutError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession(); // pragma: allowlist secret
  const token = data.session?.access_token;
  if (!token) {
    throw new PackCheckoutError("Your session expired. Please sign in again.");
  }
  return token;
}

async function postPackRoute(path: string, body: Record<string, unknown>) {
  const token = await getAccessToken();
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PackCheckoutError("Network error while starting pack checkout.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiErrorBody & {
    url?: string;
    ok?: boolean;
    flags?: PackFlags;
    pack?: OptionalPackId;
  };

  if (!response.ok) {
    throw new PackCheckoutError(
      payload.message || "Unable to start pack checkout.",
      payload.code,
    );
  }

  return payload;
}

export async function startPackCheckout(pack: OptionalPackId) {
  const payload = await postPackRoute("/api/packs/checkout", { pack });
  if (!payload.url) {
    throw new PackCheckoutError("Checkout did not return a payment page.");
  }
  window.location.assign(payload.url);
}

export async function startPackPortal(pack: OptionalPackId) {
  const payload = await postPackRoute("/api/packs/portal", { pack });
  if (!payload.url) {
    throw new PackCheckoutError("Billing portal did not return a page.");
  }
  window.location.assign(payload.url);
}

export async function confirmPackCheckout(params: {
  pack: OptionalPackId;
  sessionId: string;
}) {
  const payload = await postPackRoute("/api/packs/confirm", {
    pack: params.pack,
    sessionId: params.sessionId,
  });
  if (!payload.ok || !payload.flags) {
    throw new PackCheckoutError("Could not turn the pack on after checkout.");
  }
  return payload.flags;
}
