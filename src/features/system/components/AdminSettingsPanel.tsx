import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ErrorState } from "./ErrorState";
import { ActivityHistoryCard } from "./ActivityHistoryCard";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useAdminSettings } from "../hooks/useAdminSettings";
import { DEFAULT_ADMIN_CONFIG } from "../hooks/systemSettingsDefaults";
import {
  BILLING_PLANS,
  BILLING_STATUSES,
  type BillingPlanKey,
  type BillingStatus,
  getBillingPlanDefinition,
} from "@/services/billing/billingPlans";
import {
  BillingStatusBadge,
} from "./BillingStatusBadge";
import { useTranslation } from "react-i18next";

const toBillingIsoDate = (value: string) =>
  value ? new Date(`${value}T23:59:59.000Z`).toISOString() : null;

export function AdminSettingsPanel({
  section,
}: {
  section: "billing" | "maintenance";
}) {
  const { t } = useTranslation();
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    state,
    setState,
    dirty,
    saving,
    saveError,
    save,
    reset,
  } = useAdminSettings(system);

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  const tenant =
    state.tenantManagement ?? DEFAULT_ADMIN_CONFIG.tenantManagement;
  const selectedPlan = getBillingPlanDefinition(tenant?.plan);

  const showBilling = section === "billing";
  const showMaintenance = section === "maintenance";

  return (
    <div className="space-y-6">
      {showBilling ? (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("settings.tenantManagement")}</CardTitle>
            <CardDescription>{t("settings.internalBillingControlsForOwnershipSeatsAndWorkspace")}</CardDescription>
          </div>
          <BillingStatusBadge tenant={tenant} />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-owner">{t("settings.primaryOwnerEmail")}</Label>
            <Input
              id="tenant-owner"
              value={tenant?.primaryOwnerEmail ?? ""}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    primaryOwnerEmail: event.target.value || null,
                  },
                }))
              }
              disabled={!canEdit || loading}
              placeholder={t("settings.ownerExampleCom")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-plan">{t("settings.plan")}</Label>
            <select
              id="tenant-plan"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={tenant?.plan ?? "starter"}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    plan: event.target.value as BillingPlanKey,
                  },
                }))
              }
              disabled={!canEdit || loading}
            >
              {BILLING_PLANS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {selectedPlan.description}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-billing-status">{t("settings.workspaceAccess")}</Label>
            <select
              id="tenant-billing-status"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={tenant?.billingStatus ?? "trial"}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    billingStatus: event.target.value as BillingStatus,
                  },
                }))
              }
              disabled={!canEdit || loading}
            >
              {BILLING_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-active-seats">{t("settings.activeSeats")}</Label>
            <Input
              id="tenant-active-seats"
              type="number"
              min={0}
              value={tenant?.activeSeats ?? 0}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    activeSeats: Number(event.target.value) || 0,
                  },
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-max-seats">{t("settings.seatLimit")}</Label>
            <Input
              id="tenant-max-seats"
              type="number"
              min={1}
              value={tenant?.maxSeats ?? 10}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    maxSeats:
                      Number(event.target.value) ||
                      (
                        prev.tenantManagement ??
                        DEFAULT_ADMIN_CONFIG.tenantManagement
                      ).maxSeats,
                  },
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-billing-email">{t("settings.billingEmail")}</Label>
            <Input
              id="tenant-billing-email"
              type="email"
              value={tenant?.billingEmail ?? ""}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    billingEmail: event.target.value || null,
                  },
                }))
              }
              disabled={!canEdit || loading}
              placeholder={t("settings.billingExampleCom")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-trial-ends">{t("settings.trialEnds")}</Label>
            <Input
              id="tenant-trial-ends"
              type="date"
              value={tenant?.trialEndsAt?.slice(0, 10) ?? ""}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    trialEndsAt: toBillingIsoDate(event.target.value),
                  },
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-period-ends">{t("settings.currentPeriodEnds")}</Label>
            <Input
              id="tenant-period-ends"
              type="date"
              value={tenant?.currentPeriodEndsAt?.slice(0, 10) ?? ""}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    currentPeriodEndsAt: toBillingIsoDate(event.target.value),
                  },
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
        </CardContent>
      </Card>
      ) : null}

      {showMaintenance ? <ActivityHistoryCard /> : null}

      {saveError && <ErrorState message={saveError.message} />}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={!dirty || saving || !canEdit}
          onClick={reset}
        >{t("settings.discard")}</Button>
        <Button
          onClick={save}
          disabled={!canEdit || !dirty || saving || loading}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("settings.saving")}</>
          ) : (
            t("settings.saveAdminSettings")
          )}
        </Button>
      </div>
    </div>
  );
}
