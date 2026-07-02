type BillingApiErrorBody = {
  message?: string;
  code?: string;
};

export function mapBillingClientError(
  status: number,
  payload: BillingApiErrorBody,
  fallback = "Unable to complete billing request.",
): string {
  if (payload.message) return payload.message;

  switch (status) {
    case 401:
      return "Your session expired. Sign in again to manage billing.";
    case 403:
      return "You do not have permission to manage billing for this workspace.";
    case 402:
      return "Payment failed. Update your card in Manage billing and try again.";
    case 409:
      return "Billing is not set up for this workspace yet. Choose a plan first.";
    case 429:
      return "Too many billing requests. Wait a minute and try again.";
    case 503:
      return "Billing is temporarily unavailable. Try again shortly.";
    default:
      return fallback;
  }
}

export function mapCheckoutRedirectError(checkoutState: string | null) {
  if (checkoutState === "canceled") {
    return "Checkout was canceled. No charge was made.";
  }
  if (checkoutState === "expired") {
    return "Checkout session expired. Start checkout again from Billing settings.";
  }
  return null;
}
