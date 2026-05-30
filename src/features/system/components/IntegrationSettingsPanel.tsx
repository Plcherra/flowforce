import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { IntegrationConnection } from "@/types/system-settings";
import {
  buildAccountingPayrollReadiness,
  getAccountingExportScopes,
  getAccountingPayrollReconciliationViews,
  getPayrollLaborImportScopes,
} from "@/services/integrations/accountingPayrollIntegrations";
import {
  buildIntegrationMonitoringReadiness,
  buildIntegrationStatusDashboard,
  buildIntegrationSupportDiagnostics,
} from "@/services/integrations/integrationMonitoring";
import {
  buildMigrationIntegrationSignoffReadiness,
  buildTestTenantPopulationPlan,
  getCustomerMigrationPlaybook,
  getDemoMigrationFlow,
  getSampleDataPacks,
} from "@/services/integrations/migrationIntegrationSignoff";
import {
  buildPOSCredentialMetadata,
  buildPOSIntegrationHealthSummary,
  getPOSSyncStreamDefinitions,
} from "@/services/integrations/posIntegrationFoundation";
import {
  buildPublicApiWebhookReadiness,
  getPublicApiEventCatalog,
  getPublicApiRateLimits,
} from "@/services/integrations/publicApiWebhooks";
import { ErrorState } from "./ErrorState";
import { useIntegrationSettings } from "../hooks/useIntegrationSettings";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";

type ProviderMeta = {
  key: string;
  name: string;
  description: string;
  authType: "api_key" | "oauth";
  documentation: string;
};

const PROVIDERS: ProviderMeta[] = [
  {
    key: "toast",
    name: "Toast",
    description: "Payroll, scheduling, and sales data sync",
    authType: "api_key",
    documentation: "https://pos.toasttab.com/",
  },
  {
    key: "marketman",
    name: "MarketMan",
    description: "Inventory and recipe cost synchronization",
    authType: "api_key",
    documentation: "https://www.marketman.com/",
  },
  {
    key: "quickbooks",
    name: "QuickBooks Online",
    description: "Accounting and payroll sync",
    authType: "oauth",
    documentation: "https://quickbooks.intuit.com/",
  },
  {
    key: "xero",
    name: "Xero",
    description: "Accounting exports and reconciliation",
    authType: "oauth",
    documentation: "https://www.xero.com/",
  },
  {
    key: "gusto",
    name: "Gusto",
    description: "Payroll and labor actual imports",
    authType: "oauth",
    documentation: "https://gusto.com/",
  },
];

export function IntegrationSettingsPanel() {
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    integrations,
    updateIntegrations,
    connectIntegration,
    disconnectIntegration,
    saving,
    saveError,
  } = useIntegrationSettings(system);

  const [activeProvider, setActiveProvider] = useState<ProviderMeta | null>(
    null,
  );
  const [apiKey, setApiKey] = useState("");
  const [notes, setNotes] = useState("");

  const providerStatus = useMemo(
    () => integrations.providers ?? {},
    [integrations.providers],
  );
  const posHealth = useMemo(
    () => buildPOSIntegrationHealthSummary(integrations),
    [integrations],
  );
  const posSyncStreams = useMemo(() => getPOSSyncStreamDefinitions(), []);
  const accountingReadiness = useMemo(
    () => buildAccountingPayrollReadiness(),
    [],
  );
  const accountingExportScopes = useMemo(() => getAccountingExportScopes(), []);
  const payrollImportScopes = useMemo(() => getPayrollLaborImportScopes(), []);
  const reconciliationViews = useMemo(
    () => getAccountingPayrollReconciliationViews(),
    [],
  );
  const publicApiReadiness = useMemo(
    () => buildPublicApiWebhookReadiness(),
    [],
  );
  const publicApiEventCatalog = useMemo(() => getPublicApiEventCatalog(), []);
  const publicApiRateLimits = useMemo(() => getPublicApiRateLimits(), []);
  const monitoringDashboard = useMemo(
    () => buildIntegrationStatusDashboard(),
    [],
  );
  const monitoringReadiness = useMemo(
    () => buildIntegrationMonitoringReadiness(),
    [],
  );
  const monitoringDiagnostics = useMemo(
    () => buildIntegrationSupportDiagnostics(),
    [],
  );
  const signoffReadiness = useMemo(
    () => buildMigrationIntegrationSignoffReadiness(),
    [],
  );
  const migrationPlaybook = useMemo(() => getCustomerMigrationPlaybook(), []);
  const sampleDataPacks = useMemo(() => getSampleDataPacks(), []);
  const demoMigrationFlow = useMemo(() => getDemoMigrationFlow(), []);
  const testTenantPopulationPlan = useMemo(
    () => buildTestTenantPopulationPlan(),
    [],
  );

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  const handleConnect = async (provider: ProviderMeta) => {
    if (provider.authType === "api_key" && !apiKey.trim()) {
      return;
    }
    const connection: IntegrationConnection = {
      id: `${provider.key}-${Date.now()}`,
      provider: provider.key,
      status: "pending",
      authType: provider.authType,
      lastSyncedAt: null,
      metadata:
        provider.authType === "api_key"
          ? buildPOSCredentialMetadata({
              credentialMode: "server_vault_required",
              scopes:
                provider.key === "toast"
                  ? ["sales", "menu_items", "labor", "locations"]
                  : [],
              keyLast4: apiKey.trim().slice(-4),
              notes,
            })
          : undefined,
    };
    await connectIntegration(provider.key, connection);
    setActiveProvider(null);
    setApiKey("");
    setNotes("");
  };

  const handleDisconnect = async (providerKey: string) => {
    await disconnectIntegration(providerKey);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Manage third-party connections and synchronization rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map((provider) => {
            const status =
              providerStatus[provider.key]?.status ?? "disconnected";
            const isConnected = status === "connected";
            const isPending = status === "pending";
            return (
              <Card key={provider.key} className="border-muted shadow-sm">
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <Badge
                      variant={
                        isConnected
                          ? "default"
                          : isPending
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {provider.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Auth type:{" "}
                    {provider.authType === "api_key" ? "API Key" : "OAuth"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(provider.key)}
                        disabled={!canEdit || saving}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setActiveProvider(provider)}
                        disabled={!canEdit || saving}
                      >
                        {provider.authType === "oauth"
                          ? "Start OAuth"
                          : "Connect"}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={provider.documentation}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Docs
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                POS sync health
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Toast is the first POS foundation target. Health metadata is
                tenant-scoped and client-visible only; credentials stay in
                server-side custody.
              </p>
            </div>
            <Badge
              variant={
                posHealth.status === "error"
                  ? "destructive"
                  : posHealth.status === "healthy"
                    ? "default"
                    : posHealth.status === "not_configured"
                      ? "outline"
                      : "secondary"
              }
            >
              {posHealth.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {posSyncStreams.map((stream) => {
              const configured = posHealth.configuredStreams.includes(
                stream.key,
              );
              return (
                <div
                  key={stream.key}
                  className="rounded-md border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{stream.label}</span>
                    <Badge variant={configured ? "default" : "outline"}>
                      {configured ? "Ready" : "Needed"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {stream.target}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Last success:{" "}
              {posHealth.lastSuccessfulSyncAt
                ? new Date(posHealth.lastSuccessfulSyncAt).toLocaleString()
                : "none"}
            </span>
            <span>Failures: {posHealth.consecutiveFailures}</span>
            <span>Error: {posHealth.lastErrorCode ?? "none"}</span>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Accounting and payroll readiness
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                QuickBooks and Xero export scope, payroll labor import scope,
                retry logs, and reconciliation views are defined before live
                provider sync.
              </p>
            </div>
            <Badge variant="secondary">foundation</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Accounting exports</span>
                <Badge
                  variant={
                    accountingReadiness.quickBooksAndXeroExportScopesReady
                      ? "default"
                      : "outline"
                  }
                >
                  {accountingExportScopes.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                QuickBooks/Xero bills, expenses, payments, credits, summaries,
                and journal entries.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Payroll imports</span>
                <Badge
                  variant={
                    accountingReadiness.payrollLaborImportScopesReady
                      ? "default"
                      : "outline"
                  }
                >
                  {payrollImportScopes.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Employees, labor actuals, pay periods, wage rates, and payroll
                journal summaries.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Logs and retries</span>
                <Badge
                  variant={
                    accountingReadiness.exportLogsAndRetriesReady
                      ? "default"
                      : "outline"
                  }
                >
                  Ready
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Payload hashes, idempotency keys, attempts, errors, and next
                retry timestamps.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Reconciliation</span>
                <Badge
                  variant={
                    accountingReadiness.reconciliationViewsReady
                      ? "default"
                      : "outline"
                  }
                >
                  {reconciliationViews.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Export, payroll labor, and cost-of-goods mismatch review views.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Public API and webhooks
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                API keys, webhook subscriptions, event catalog, rate limits, and
                delivery audit logs are defined before external developer
                access.
              </p>
            </div>
            <Badge variant="secondary">platform foundation</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">API key model</span>
                <Badge
                  variant={
                    publicApiReadiness.apiKeyModelReady ? "default" : "outline"
                  }
                >
                  Scoped
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tenant-scoped, hashed, shown once, revocable, expiring keys.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Webhook events</span>
                <Badge
                  variant={
                    publicApiReadiness.eventCatalogReady ? "default" : "outline"
                  }
                >
                  {publicApiEventCatalog.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Employees, schedules, inventory counts, purchase orders,
                workflows, and incidents.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Rate limits</span>
                <Badge
                  variant={
                    publicApiReadiness.rateLimitsReady ? "default" : "outline"
                  }
                >
                  {publicApiRateLimits.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tenant API limits and webhook delivery limits with blocking
                behavior.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Audit logs</span>
                <Badge
                  variant={
                    publicApiReadiness.auditActionsReady ? "default" : "outline"
                  }
                >
                  Ready
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Key lifecycle, webhook delivery, and rate-limit decisions are
                audited.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Integration monitoring
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sync health, last success, failures, retries, warnings, alerts,
                and support diagnostics are visible before live monitoring
                workers.
              </p>
            </div>
            <Badge
              variant={
                monitoringDashboard.failingCount > 0
                  ? "destructive"
                  : monitoringDashboard.warningCount > 0
                    ? "secondary"
                    : "default"
              }
            >
              {monitoringDashboard.failingCount} failing
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Status dashboard</span>
                <Badge
                  variant={
                    monitoringReadiness.syncStatusDashboardReady
                      ? "default"
                      : "outline"
                  }
                >
                  {monitoringDashboard.totalIntegrations}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Healthy {monitoringDashboard.healthyCount}; warning{" "}
                {monitoringDashboard.warningCount}; retrying{" "}
                {monitoringDashboard.retryingCount}.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Critical alerts</span>
                <Badge
                  variant={
                    monitoringReadiness.criticalAlertingReady
                      ? "default"
                      : "outline"
                  }
                >
                  {monitoringDashboard.staleCriticalCount}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Broken critical syncs trigger tenant admin and support review.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Diagnostics</span>
                <Badge
                  variant={
                    monitoringReadiness.supportDiagnosticsReady
                      ? "default"
                      : "outline"
                  }
                >
                  {monitoringDiagnostics.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Support-safe evidence includes last success, failures, next
                retry, and warnings.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Simulated failures</span>
                <Badge
                  variant={
                    monitoringReadiness.simulatedFailuresVisible
                      ? "default"
                      : "outline"
                  }
                >
                  Visible
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Toast, QuickBooks, MarketMan, and webhook issues are represented
                in the dashboard contract.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Migration and integration signoff
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Customer playbook, sample data packs, demo migration flow, and
                test-tenant population checks are ready for pilot handoff.
              </p>
            </div>
            <Badge variant="default">Plan 09 signoff</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Playbook</span>
                <Badge
                  variant={
                    signoffReadiness.customerMigrationPlaybookReady
                      ? "default"
                      : "outline"
                  }
                >
                  {migrationPlaybook.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Scope, prepare, import, validate, connect, monitor, and handoff.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Sample packs</span>
                <Badge
                  variant={
                    signoffReadiness.sampleDataPacksReady
                      ? "default"
                      : "outline"
                  }
                >
                  {sampleDataPacks.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Restaurant, retail, and operations workflow demo tenants.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Demo flow</span>
                <Badge
                  variant={
                    signoffReadiness.demoMigrationFlowReady
                      ? "default"
                      : "outline"
                  }
                >
                  {demoMigrationFlow.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Test tenant creation through owner acceptance and open-risk
                review.
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Test tenant</span>
                <Badge
                  variant={
                    signoffReadiness.testTenantCanBePopulated
                      ? "default"
                      : "outline"
                  }
                >
                  {Object.keys(testTenantPopulationPlan.expectedRecords).length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Expected records and signoff checks are defined for sample
                population.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Connection activity
          </h3>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Last sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.connections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No connections yet.
                  </TableCell>
                </TableRow>
              ) : (
                integrations.connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">
                      {connection.provider}
                    </TableCell>
                    <TableCell>{connection.status}</TableCell>
                    <TableCell>
                      {connection.connectedAt
                        ? new Date(connection.connectedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {connection.lastSyncedAt
                        ? new Date(connection.lastSyncedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Adjust auto-sync rules and mappings as integrations go live.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateIntegrations({
                syncMappings: {
                  ...integrations.syncMappings,
                },
              })
            }
            disabled={saving || !canEdit}
          >
            Refresh mappings
          </Button>
        </div>

        {saveError && <ErrorState message={saveError.message} />}

        {activeProvider && (
          <Dialog open onOpenChange={() => setActiveProvider(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect {activeProvider.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Raw API keys are never stored in browser-readable settings. This
                marks setup as pending until server-side credential custody is
                configured.
              </p>
              {activeProvider.authType === "api_key" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      API Key
                    </label>
                    <Input
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="Paste API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Notes
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      placeholder="Optional context for teammates"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Continue to {activeProvider.name} to authorize FlowForce. You
                  will be redirected back automatically.
                </p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActiveProvider(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleConnect(activeProvider)}
                  disabled={
                    saving ||
                    (activeProvider.authType === "api_key" && !apiKey.trim())
                  }
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {activeProvider.authType === "oauth" ? "Continue" : "Connect"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
