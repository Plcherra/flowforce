import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";
import { getStripeClient } from "@/server/billing/stripeClient";
import { planKeyFromStripePriceId } from "@/server/billing/stripePrices";
import {
  BILLING_AUDIT,
  findCompanyIdByStripeCustomer,
  recordStripeWebhookEvent,
  syncStripeBilling,
} from "@/server/billing/syncStripeBilling";
import { normalizeBillingPlan } from "@/services/billing/billingPlans";
import { requireEnv } from "@/lib/env";

const logger = createServerLogger("stripe-webhooks");

export const dynamic = "force-dynamic";

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ message }, { status });

const readCustomerId = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) => {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
};

async function loadSubscription(
  subscriptionId: string | Stripe.Subscription | null | undefined,
): Promise<Stripe.Subscription | null> {
  if (!subscriptionId) return null;
  if (typeof subscriptionId !== "string") return subscriptionId;

  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const companyId =
    session.metadata?.company_id ?? session.client_reference_id ?? null;
  const customerId = readCustomerId(session.customer);
  const subscription = await loadSubscription(session.subscription);
  const plan =
    normalizeBillingPlan(session.metadata?.plan) ??
    normalizeBillingPlan(subscription?.metadata?.plan);

  if (!companyId) {
    throw new Error("checkout.session.completed missing company_id metadata");
  }

  const syncResult = await syncStripeBilling(supabaseAdmin, {
    companyId,
    customerId,
    subscription,
    planOverride: plan,
    clearPaymentFailure: true,
    auditAction: BILLING_AUDIT.checkoutCompleted,
    auditMetadata: {
      source: "stripe.webhook",
      stripeEventId: event.id,
      checkoutSessionId: session.id,
    },
  });

  if (!syncResult.ok) {
    throw new Error(syncResult.ok === false ? syncResult.message : "Sync failed");
  }

  return companyId;
}

async function handleSubscriptionEvent(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = readCustomerId(subscription.customer);
  const companyId = await findCompanyIdByStripeCustomer(
    supabaseAdmin,
    customerId ?? "",
    subscription.metadata?.company_id,
  );

  if (!companyId) {
    throw new Error(`${event.type} could not resolve company for customer`);
  }

  const auditAction =
    event.type === "customer.subscription.deleted"
      ? BILLING_AUDIT.subscriptionCanceled
      : BILLING_AUDIT.subscriptionUpdated;

  const syncResult = await syncStripeBilling(supabaseAdmin, {
    companyId,
    customerId,
    subscription,
    clearPaymentFailure: subscription.status === "active",
    auditAction,
    auditMetadata: {
      source: "stripe.webhook",
      stripeEventId: event.id,
      stripeSubscriptionStatus: subscription.status,
    },
  });

  if (!syncResult.ok) {
    throw new Error(syncResult.ok === false ? syncResult.message : "Sync failed");
  }

  return companyId;
}

async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = readCustomerId(invoice.customer);
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : invoice.parent?.subscription_details?.subscription?.id ?? null;
  const subscription = await loadSubscription(subscriptionId);
  const companyId = await findCompanyIdByStripeCustomer(
    supabaseAdmin,
    customerId ?? "",
    subscription?.metadata?.company_id ?? invoice.metadata?.company_id,
  );

  if (!companyId) {
    throw new Error("invoice.payment_failed could not resolve company");
  }

  const subscriptionStatus = subscription?.status;

  const syncResult = await syncStripeBilling(supabaseAdmin, {
    companyId,
    customerId,
    subscription,
    recordPaymentFailure: true,
    auditAction: BILLING_AUDIT.paymentFailed,
    auditMetadata: {
      source: "stripe.webhook",
      stripeEventId: event.id,
      invoiceId: invoice.id,
      stripeSubscriptionStatus: subscriptionStatus ?? null,
    },
  });

  if (!syncResult.ok) {
    throw new Error(syncResult.ok === false ? syncResult.message : "Sync failed");
  }

  return companyId;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const scopedLogger = logger.child({ requestId });

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return jsonError("Missing Stripe signature.", 400);
    }

    const payload = await request.text();
    const stripe = getStripeClient();
    const webhookSecret = requireEnv(
      process.env.STRIPE_WEBHOOK_SECRET,
      "STRIPE_WEBHOOK_SECRET",
    );

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      scopedLogger.warn("Invalid Stripe webhook signature", { error });
      return jsonError("Invalid Stripe signature.", 400);
    }

    const idempotency = await recordStripeWebhookEvent(
      supabaseAdmin,
      event.id,
      event.type,
      null,
    );

    if (idempotency === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    let companyId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed":
        companyId = await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        companyId = await handleSubscriptionEvent(event);
        break;
      case "invoice.payment_failed":
        companyId = await handlePaymentFailed(event);
        break;
      default:
        await supabaseAdmin
          .from("stripe_webhook_events")
          .delete()
          .eq("id", event.id);
        return NextResponse.json({ received: true, ignored: event.type });
    }

    if (companyId) {
      await supabaseAdmin
        .from("stripe_webhook_events")
        .update({ company_id: companyId })
        .eq("id", event.id);
    }

    return NextResponse.json({ received: true, companyId });
  } catch (error) {
    scopedLogger.error("Stripe webhook processing failed", { error });
    return jsonError("Webhook handler failed.", 500);
  }
}

export async function GET() {
  return jsonError("Stripe webhooks must use POST.", 405);
}
