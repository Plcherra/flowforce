import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(
      requireEnv(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"),
    );
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_STARTER &&
      process.env.STRIPE_PRICE_GROWTH &&
      process.env.STRIPE_PRICE_ENTERPRISE,
  );
}
