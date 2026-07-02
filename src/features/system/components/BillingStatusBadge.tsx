import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  getBillingStatusLabel,
  isTrialExpired,
  resolveBillingStatus,
  type BillingStatus,
} from "@/services/billing/billingPlans";
import type { TenantManagementSettings } from "@/types/system-settings";
import { cn } from "@/lib/utils";

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
};

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
  const status = resolveBillingStatus(tenant);
  const trialEndedWithoutUpgrade =
    tenant?.billingStatus === "trial" && isTrialExpired(tenant);

  if (status === "active") {
    return null;
  }

  const isDeactivated = status === "deactivated";
  const label = isDeactivated ? "Reactivate on pricing" : "View plans and upgrade";
  const href = isDeactivated ? "/pricing?intent=reactivate" : "/pricing?intent=upgrade";

  return (
    <div className={cn("space-y-2", className)}>
      <Link
        href={href}
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
      >
        {label}
      </Link>
      {showHelperText ? (
        <p className="text-sm text-muted-foreground">
          {isDeactivated
            ? "Choose a plan to restore scheduling, inventory, tasks, messaging, and reporting for your team."
            : trialEndedWithoutUpgrade
              ? "Your trial period has ended. Pick a plan to keep your workspace active."
              : "Compare Starter, Growth, and Enterprise plans for your restaurant workspace."}
        </p>
      ) : null}
    </div>
  );
}
