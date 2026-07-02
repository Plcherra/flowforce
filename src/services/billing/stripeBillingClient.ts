import { supabase } from "@/integrations/supabase/client";
import type { BillingPlanKey } from "@/services/billing/billingPlans";
import { mapBillingClientError } from "@/services/billing/stripeBillingErrors";

type CheckoutIntent = "upgrade" | "reactivate";

type ApiErrorBody = {
  message?: string;
  code?: string;
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Your session expired. Please sign in again.");
  }
  return token;
}

async function postStripeRoute(path: string, body?: Record<string, unknown>) {
  const token = await getAccessToken();
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Network error while starting billing. Check your connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as ApiErrorBody & {
    url?: string;
  };

  if (!response.ok) {
    throw new Error(
      mapBillingClientError(response.status, payload, path.includes("checkout")
        ? "Unable to start checkout. Try again from Billing settings."
        : "Unable to open billing portal. Try again from Billing settings."),
    );
  }

  return payload;
}

export async function startStripeCheckout(params: {
  plan: BillingPlanKey;
  intent?: CheckoutIntent;
}) {
  const payload = await postStripeRoute("/api/stripe/create-checkout-session", {
    plan: params.plan,
    intent: params.intent ?? "upgrade",
  });

  if (!payload.url) {
    throw new Error(
      "Checkout session expired before redirect. Start checkout again.",
    );
  }

  window.location.assign(payload.url);
}

export async function openStripeBillingPortal() {
  const payload = await postStripeRoute("/api/stripe/create-portal-session");
  if (!payload.url) {
    throw new Error(
      "Billing portal session expired before redirect. Try Manage billing again.",
    );
  }
  window.location.assign(payload.url);
}
