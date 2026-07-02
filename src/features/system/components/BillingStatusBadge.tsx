"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getBillingPlanDefinition,
  getBillingStatusLabel,
  isTrialExpired,
  resolveBillingStatus,
  type BillingPlanKey,
  type BillingStatus,
} from "@/services/billing/billingPlans";
import type { TenantManagementSettings } from "@/types/system-settings";
import { cn } from "@/lib/utils";
import {
  openStripeBillingPortal,
  startStripeCheckout,
} from "@/services/billing/stripeBillingClient";
import { useToast } from "@/hooks/use-toast";

const STATUS_VARIANT: Record<
  BillingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  trial: "secondary",
  active: "default",
  deactivated: "destructive",
};

type BillingStatusBadgeProps = {
  tenant?: Partial<TenantManagementSettings> | null;
  className?: string;
};

export function BillingStatusBadge({
  tenant,
  className,
}: BillingStatusBadgeProps) {
  const status = resolveBillingStatus(tenant);
  return (
    <Badge variant={STATUS_VARIANT[status]} className={cn(className)}>
      {getBillingStatusLabel(status)}
    </Badge>
  );
}

type BillingStatusActionsProps = {
  tenant?: Partial<TenantManagementSettings> | null;
  className?: string;
  showHelperText?: boolean;
};

export function BillingStatusActions({
  tenant,
  className,
  showHelperText = false,
}: BillingStatusActionsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<
    "checkout" | "portal" | BillingPlanKey | null
  >(null);
  const status = resolveBillingStatus(tenant);
  const trialEndedWithoutUpgrade =
    tenant?.billingStatus === "trial" && isTrialExpired(tenant);
  const currentPlan = getBillingPlanDefinition(tenant?.plan);

  const handleCheckout = async (
    plan: BillingPlanKey,
    intent: "upgrade" | "reactivate",
  ) => {
    setLoading(plan);
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
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      await openStripeBillingPortal();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Billing portal unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Unable to open Stripe billing portal.",
      });
      setLoading(null);
    }
  };

  if (status === "active") {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          onClick={() => void handlePortal()}
          disabled={loading !== null}
        >
          {loading === "portal" ? "Opening Stripe…" : "Manage billing"}
        </Button>
        {showHelperText ? (
          <p className="text-sm text-muted-foreground">
            Update payment method, invoices, or cancel through the Stripe
            customer portal.
          </p>
        ) : null}
      </div>
    );
  }

  const isDeactivated = status === "deactivated";
  const intent = isDeactivated ? "reactivate" : "upgrade";
  const label = isDeactivated
    ? `Reactivate with ${currentPlan.label}`
    : `Upgrade to ${currentPlan.label}`;

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        onClick={() => void handleCheckout(currentPlan.key, intent)}
        disabled={loading !== null}
      >
        {loading === currentPlan.key ? "Redirecting to Stripe…" : label}
      </Button>
      {showHelperText ? (
        <p className="text-sm text-muted-foreground">
          {isDeactivated
            ? "Choose a plan to restore scheduling, inventory, tasks, messaging, and reporting for your team."
            : trialEndedWithoutUpgrade
              ? "Your trial period has ended. Pick a plan to keep your workspace active."
              : "Compare Starter, Growth, and Enterprise plans for your restaurant workspace."}{" "}
          <a href="/pricing" className="underline">
            View all plans
          </a>
        </p>
      ) : null}
    </div>
  );
}
