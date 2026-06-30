import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, BotOff, Download, Loader2, ShieldOff } from "lucide-react";
import { ErrorState } from "./ErrorState";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useAdminSettings } from "../hooks/useAdminSettings";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { DEFAULT_ADMIN_CONFIG } from "../hooks/systemSettingsDefaults";
import {
  BILLING_ACCOUNT_STATUSES,
  BILLING_PLANS,
  type BillingAccountStatus,
  type BillingPlanKey,
  getBillingPlanDefinition,
} from "@/services/billing/billingPlans";
import type { TenantManagementSettings } from "@/types/system-settings";

const SUBSCRIPTION_STATUS_OPTIONS = [
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
] as const;

type SubscriptionStatus = TenantManagementSettings["subscriptionStatus"];

const toBillingIsoDate = (value: string) =>
  value ? new Date(`${value}T23:59:59.000Z`).toISOString() : null;

export function AdminSettingsPanel() {
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
    refreshSnapshot,
    syncing,
    syncError,
  } = useAdminSettings(system);
  const auditLogs = useAuditLogs();
  const [dangerConfirmation, setDangerConfirmation] = useState("");

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  const tenant =
    state.tenantManagement ?? DEFAULT_ADMIN_CONFIG.tenantManagement;
  const selectedPlan = getBillingPlanDefinition(tenant?.plan);
  const confirmationPhrase = system.company?.name?.trim() || "CONFIRM";
  const dangerousActionsUnlocked =
    dangerConfirmation.trim() === confirmationPhrase;

  const handleExportSettingsBackup = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            company: system.company,
            settings: system.settings,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `flowforce-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const stageTenantSuspension = () => {
    setState((prev) => ({
      ...prev,
      tenantManagement: {
        ...(prev.tenantManagement ?? DEFAULT_ADMIN_CONFIG.tenantManagement),
        accountStatus: "suspended",
      },
    }));
  };

  const stageAiPause = () => {
    setState((prev) => ({
      ...prev,
      aiCopilot: {
        ...prev.aiCopilot,
        enabled: false,
        automationLevel: "suggestion",
        lastAuditAt: new Date().toISOString(),
      },
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant management</CardTitle>
          <CardDescription>
            Update ownership, seat allocation, and billing configuration for
            this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-owner">Primary owner email</Label>
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
              placeholder="owner@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-plan">Plan</Label>
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
            <Label htmlFor="tenant-account-status">Account status</Label>
            <select
              id="tenant-account-status"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={tenant?.accountStatus ?? "trialing"}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    accountStatus: event.target.value as BillingAccountStatus,
                  },
                }))
              }
              disabled={!canEdit || loading}
            >
              {BILLING_ACCOUNT_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-subscription-status">
              Subscription status
            </Label>
            <select
              id="tenant-subscription-status"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={tenant?.subscriptionStatus ?? "none"}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    subscriptionStatus: event.target
                      .value as SubscriptionStatus,
                  },
                }))
              }
              disabled={!canEdit || loading}
            >
              {SUBSCRIPTION_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-active-seats">Active seats</Label>
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
            <Label htmlFor="tenant-max-seats">Seat limit</Label>
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
            <Label htmlFor="tenant-billing-email">Billing email</Label>
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
              placeholder="billing@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-trial-ends">Trial ends</Label>
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
            <Label htmlFor="tenant-period-ends">Current period ends</Label>
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

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Business structure snapshot</CardTitle>
            <CardDescription>
              Sync locations and role templates from live company data for
              downstream governance.
            </CardDescription>
          </div>
          <Button
            onClick={refreshSnapshot}
            disabled={syncing || !canEdit}
            variant="outline"
          >
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh snapshot
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              Locations:{" "}
              <Badge variant="outline">
                {state.businessStructure.locations.length}
              </Badge>
            </span>
            <span>
              Departments:{" "}
              <Badge variant="outline">
                {state.businessStructure.departments.length}
              </Badge>
            </span>
            <span>
              Role templates:{" "}
              <Badge variant="outline">{state.roleTemplates.length}</Badge>
            </span>
          </div>
          {syncError && <ErrorState message={syncError.message} />}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            High-risk admin actions
          </CardTitle>
          <CardDescription>
            Stage sensitive tenant changes behind explicit confirmation. Changes
            are not applied until you save admin settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Confirmation required</AlertTitle>
            <AlertDescription>
              Type <span className="font-semibold">{confirmationPhrase}</span>{" "}
              to unlock high-risk actions for this workspace.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="danger-confirmation">
                Workspace confirmation
              </Label>
              <Input
                id="danger-confirmation"
                value={dangerConfirmation}
                onChange={(event) => setDangerConfirmation(event.target.value)}
                disabled={!canEdit || loading}
                placeholder={confirmationPhrase}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportSettingsBackup}
            >
              <Download className="mr-2 h-4 w-4" />
              Export backup
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Stage tenant suspension
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Marks the account as suspended for billing/admin review.
                  </p>
                </div>
                <ShieldOff className="h-5 w-5 text-destructive" />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-4"
                onClick={stageTenantSuspension}
                disabled={!canEdit || !dangerousActionsUnlocked || loading}
              >
                Stage suspension
              </Button>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pause AI automation
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Disables AI execution and returns automation to suggestion
                    mode.
                  </p>
                </div>
                <BotOff className="h-5 w-5 text-destructive" />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-4"
                onClick={stageAiPause}
                disabled={!canEdit || !dangerousActionsUnlocked || loading}
              >
                Stage AI pause
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit activity</CardTitle>
          <CardDescription>
            Track privileged configuration changes across the tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLogs.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit
              history…
            </div>
          ) : auditLogs.error ? (
            <ErrorState message={(auditLogs.error as Error).message} />
          ) : auditLogs.data && auditLogs.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.data.slice(0, 5).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.action}
                    </TableCell>
                    <TableCell>
                      {entry.performed_byprofile?.email ??
                        entry.performed_by ??
                        "Unknown"}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No audit events recorded.
            </p>
          )}
        </CardContent>
      </Card>

      {saveError && <ErrorState message={saveError.message} />}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={!dirty || saving || !canEdit}
          onClick={reset}
        >
          Discard
        </Button>
        <Button
          onClick={save}
          disabled={!canEdit || !dirty || saving || loading}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
            </>
          ) : (
            "Save admin settings"
          )}
        </Button>
      </div>
    </div>
  );
}
