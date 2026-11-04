"use client";

import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorState } from "./ErrorState";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { DEFAULT_ADMIN_CONFIG } from "../hooks/systemSettingsDefaults";
import {
  getBillingPlanDefinition,
  isTrialExpired,
  resolveBillingStatus,
} from "@/services/billing/billingPlans";
import {
  BillingStatusActions,
  BillingStatusBadge,
} from "./BillingStatusBadge";
import { getPaymentGraceEndsAt } from "@/services/billing/billingGracePeriod";
import { useTranslation } from "react-i18next";

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export function BillingSettingsPanel() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const { settings, loading, error } = useSystemSettingsContext();
  const tenant =
    settings?.adminConfig.tenantManagement ??
    DEFAULT_ADMIN_CONFIG.tenantManagement;
  const plan = getBillingPlanDefinition(tenant?.plan);
  const status = resolveBillingStatus(tenant);
  const trialEnded =
    tenant?.billingStatus === "trial" && isTrialExpired(tenant);
  const adminDeactivated = tenant?.billingStatus === "deactivated";
  const paymentGraceEndsAt = getPaymentGraceEndsAt(tenant?.paymentFailedAt);

  if (error) {
    return <ErrorState message={error.message} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{t("settings.workspaceBilling")}</CardTitle>
            <CardDescription>{t("settings.yourPlanSeatUsageAndWorkspaceAccessStatus")}</CardDescription>
          </div>
          <BillingStatusBadge tenant={tenant} />
        </CardHeader>
        <CardContent className="space-y-6">
          {checkoutState === "success" ? (
            <Alert>
              <AlertTitle>{t("settings.paymentReceived")}</AlertTitle>
              <AlertDescription>{t("settings.stripeCheckoutCompletedYourWorkspaceBillingStatusWill")}</AlertDescription>
            </Alert>
          ) : null}

          {tenant?.paymentFailedAt && status === "active" ? (
            <Alert variant="destructive">
              <AlertTitle>{t("settings.paymentFailed")}</AlertTitle>
              <AlertDescription>
                {paymentGraceEndsAt
                  ? t("literals.weCouldNotChargeYourCardUpdateYour", { value0: formatDate(paymentGraceEndsAt) })
                  : t("literals.weCouldNotChargeYourCardUpdateYour2")}
              </AlertDescription>
            </Alert>
          ) : null}

          {status === "deactivated" ? (
            <Alert variant="destructive">
              <AlertTitle>
                {trialEnded
                  ? t("literals.trialEnded")
                  : adminDeactivated
                    ? t("literals.workspaceDeactivated")
                    : t("literals.accessLimited")}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  {trialEnded && tenant?.trialEndsAt
                    ? t("literals.yourTrialEndedOnChooseAPlanTo", { value0: formatDate(tenant.trialEndsAt) })
                    : tenant?.paymentFailedAt
                      ? t("literals.yourSubscriptionPaymentFailedAndTheGracePeriod")
                      : adminDeactivated
                        ? t("literals.thisWorkspaceWasDeactivatedChooseAPlanTo")
                        : t("literals.operationalFeaturesAreCurrentlyLimitedReactivatingRestoresFull")}
                </p>
                {!trialEnded && !adminDeactivated && !tenant?.paymentFailedAt ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    <li>{t("settings.schedulingTasksAndDailyExecutionWorkflows")}</li>
                    <li>{t("settings.inventoryPurchasingAndWasteTracking")}</li>
                    <li>{t("settings.teamMessagingUpdatesAndChecklists")}</li>
                    <li>{t("settings.reportsAndCostVisibilityForOwners")}</li>
                  </ul>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {status === "trial" && tenant?.trialEndsAt ? (
            <Alert>
              <AlertTitle>{t("settings.trialWorkspace")}</AlertTitle>
              <AlertDescription>
                {t("literals.yourTrialEndsOnUpgradeBeforeThenTo", { value0: formatDate(tenant.trialEndsAt) })}
              </AlertDescription>
            </Alert>
          ) : status === "trial" ? (
            <Alert>
              <AlertTitle>{t("settings.trialWorkspace")}</AlertTitle>
              <AlertDescription>{t("settings.youAreOnATrialPlanWithFull")}</AlertDescription>
            </Alert>
          ) : null}

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{t("settings.plan")}</dt>
              <dd className="text-base font-medium">{plan.label}</dd>
              <dd className="text-xs text-muted-foreground">{plan.description}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("settings.seats")}</dt>
              <dd className="text-base font-medium">
                {loading
                  ? "…"
                  : t("literals.text22", { value0: tenant?.activeSeats ?? 0, value1: tenant?.maxSeats ?? plan.seatLimit })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("settings.billingContact")}</dt>
              <dd className="text-base font-medium">
                {tenant?.billingEmail ?? tenant?.primaryOwnerEmail ?? t("literals.notSet")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("settings.currentPeriodEnds")}</dt>
              <dd className="text-base font-medium">
                {formatDate(tenant?.currentPeriodEndsAt)}
              </dd>
            </div>
            {tenant?.cancelAt ? (
              <div>
                <dt className="text-sm text-muted-foreground">{t("settings.scheduledCancel")}</dt>
                <dd className="text-base font-medium">
                  {formatDate(tenant.cancelAt)}
                </dd>
              </div>
            ) : null}
          </dl>

          <BillingStatusActions tenant={tenant} showHelperText />
        </CardContent>
      </Card>
    </div>
  );
}
