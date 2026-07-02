import Stripe from "stripe";

export function mapStripeRouteError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof Stripe.errors.StripeCardError) {
    return {
      message:
        "Your card was declined. Update your payment method in Manage billing and try again.",
      status: 402,
    };
  }

  if (error instanceof Stripe.errors.StripeRateLimitError) {
    return {
      message: "Stripe is busy right now. Please wait a moment and try again.",
      status: 429,
    };
  }

  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    const param = error.param ?? "";
    if (param.includes("price")) {
      return {
        message:
          "This plan is not configured for checkout yet. Contact support if the problem continues.",
        status: 503,
      };
    }
    return {
      message:
        "We could not start billing checkout. Refresh the page and try again.",
      status: 400,
    };
  }

  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    return {
      message:
        "Billing is temporarily unavailable. Our team has been notified.",
      status: 503,
    };
  }

  if (error instanceof Stripe.errors.StripeConnectionError) {
    return {
      message:
        "Could not reach Stripe. Check your connection and try again.",
      status: 503,
    };
  }

  if (error instanceof Stripe.errors.StripeAPIError) {
    return {
      message: "Billing service error. Please try again in a few minutes.",
      status: 502,
    };
  }

  return {
    message: "Unable to complete billing request. Please try again.",
    status: 500,
  };
}
