"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BILLING_PLANS,
  type BillingPlanKey,
} from "@/services/billing/billingPlans";
import { startStripeCheckout } from "@/services/billing/stripeBillingClient";
import { mapCheckoutRedirectError } from "@/services/billing/stripeBillingErrors";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const PLAN_FEATURES: Record<BillingPlanKey, string[]> = {
  starter: [
    "Up to 10 seats",
    "Prep par and waste tracking",
    "Shift swapping",
    "Data export",
  ],
  growth: [
    "Up to 50 seats",
    "Purchasing and custom reports",
    "Engagement metrics",
    "OODA loop visibility",
  ],
  enterprise: [
    "Up to 250 seats",
    "Advanced inventory and reports",
    "AI scheduling optimization",
    "Integration-ready controls",
  ],
};

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const intent =
    searchParams.get("intent") === "reactivate" ? "reactivate" : "upgrade";
  const checkoutState = searchParams.get("checkout");
  const checkoutMessage = mapCheckoutRedirectError(checkoutState);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanKey | null>(null);

  const handleSelectPlan = async (plan: BillingPlanKey) => {
    if (!user) {
      window.location.assign("/auth?redirect=/pricing");
      return;
    }

    setLoadingPlan(plan);
    try {
      await startStripeCheckout({ plan, intent });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Checkout unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Unable to start Stripe checkout.",
      });
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 space-y-4 text-center">
          <Badge variant="secondary">FlowForce billing</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plans for restaurant operations
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Choose Starter, Growth, or Enterprise. Checkout is handled securely
            through Stripe and updates your workspace automatically.
          </p>
          {intent === "reactivate" ? (
            <Alert className="mx-auto max-w-2xl text-left">
              <AlertTitle>Reactivate your workspace</AlertTitle>
              <AlertDescription>
                Pick a plan below to restore scheduling, inventory, tasks, and
                reporting for your team.
              </AlertDescription>
            </Alert>
          ) : null}
          {checkoutMessage ? (
            <Alert className="mx-auto max-w-2xl text-left">
              <AlertTitle>Checkout canceled</AlertTitle>
              <AlertDescription>{checkoutMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {BILLING_PLANS.map((plan) => {
            const isPopular = plan.key === "growth";
            return (
              <Card
                key={plan.key}
                className={
                  isPopular ? "border-primary shadow-lg md:scale-[1.02]" : ""
                }
              >
                <CardHeader className="space-y-3">
                  {isPopular ? (
                    <Badge className="w-fit">Most popular</Badge>
                  ) : null}
                  <CardTitle>{plan.label}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="text-sm text-muted-foreground">
                    Up to {plan.seatLimit} seats
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-2 text-sm">
                    {PLAN_FEATURES[plan.key].map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "secondary"}
                    disabled={loadingPlan !== null}
                    onClick={() => void handleSelectPlan(plan.key)}
                  >
                    {loadingPlan === plan.key
                      ? "Redirecting to Stripe…"
                      : intent === "reactivate"
                        ? `Reactivate with ${plan.label}`
                        : `Upgrade to ${plan.label}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          {user ? (
            <Link href="/app/settings?tab=billing" className="underline">
              Return to billing settings
            </Link>
          ) : (
            <Link href="/auth" className="underline">
              Sign in to manage an existing workspace
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
