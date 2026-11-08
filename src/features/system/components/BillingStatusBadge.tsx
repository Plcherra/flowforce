"use client";

import { Badge } from "@/components/ui/badge";
import {
  getBillingStatusLabel,
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
}
