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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        <CardTitle>{t("footer.integrations")}</CardTitle>
        <CardDescription>{t("settings.manageThirdPartyConnectionsAndSynchronizationRules")}</CardDescription>
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
                      >{t("settings.disconnect")}</Button>
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
                      >{t("settings.docs")}</a>
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
              <h3 className="text-sm font-semibold text-foreground">{t("settings.posSyncHealth")}</h3>
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
              <h3 className="text-sm font-semibold text-foreground">{t("settings.accountingAndPayrollReadiness")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("settings.quickbooksAndXeroExportScopePayrollLaborImport")}</p>
            </div>
            <Badge variant="secondary">{t("settings.foundation")}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.accountingExports")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.quickbooksXeroBillsExpensesPaymentsCreditsSummariesAnd")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.payrollImports")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.employeesLaborActualsPayPeriodsWageRatesAnd")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.logsAndRetries")}</span>
                <Badge
                  variant={
                    accountingReadiness.exportLogsAndRetriesReady
                      ? "default"
                      : "outline"
                  }
                >{t("analytics.ready")}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.payloadHashesIdempotencyKeysAttemptsErrorsAndNext")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.reconciliation")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.exportPayrollLaborAndCostOfGoodsMismatch")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t("settings.publicApiAndWebhooks")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("settings.apiKeysWebhookSubscriptionsEventCatalogRateLimits")}</p>
            </div>
            <Badge variant="secondary">{t("settings.platformFoundation")}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.apiKeyModel")}</span>
                <Badge
                  variant={
                    publicApiReadiness.apiKeyModelReady ? "default" : "outline"
                  }
                >{t("settings.scoped")}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.tenantScopedHashedShownOnceRevocableExpiringKeys")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.webhookEvents")}</span>
                <Badge
                  variant={
                    publicApiReadiness.eventCatalogReady ? "default" : "outline"
                  }
                >
                  {publicApiEventCatalog.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.employeesSchedulesInventoryCountsPurchaseOrdersWorkflowsAnd")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.rateLimits")}</span>
                <Badge
                  variant={
                    publicApiReadiness.rateLimitsReady ? "default" : "outline"
                  }
                >
                  {publicApiRateLimits.length}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.tenantApiLimitsAndWebhookDeliveryLimitsWith")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.auditLogs")}</span>
                <Badge
                  variant={
                    publicApiReadiness.auditActionsReady ? "default" : "outline"
                  }
                >{t("analytics.ready")}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.keyLifecycleWebhookDeliveryAndRateLimitDecisions")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t("settings.integrationMonitoring")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("settings.syncHealthLastSuccessFailuresRetriesWarningsAlerts")}</p>
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
                <span className="text-sm font-medium">{t("settings.statusDashboard")}</span>
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
                <span className="text-sm font-medium">{t("settings.criticalAlerts")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.brokenCriticalSyncsTriggerTenantAdminAndSupport")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.diagnostics")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.supportSafeEvidenceIncludesLastSuccessFailuresNext")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.simulatedFailures")}</span>
                <Badge
                  variant={
                    monitoringReadiness.simulatedFailuresVisible
                      ? "default"
                      : "outline"
                  }
                >{t("settings.visible")}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.toastQuickbooksMarketmanAndWebhookIssuesAreRepresented")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t("settings.migrationAndIntegrationSignoff")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("settings.customerPlaybookSampleDataPacksDemoMigrationFlow")}</p>
            </div>
            <Badge variant="default">{t("settings.plan09Signoff")}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.playbook")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.scopePrepareImportValidateConnectMonitorAndHandoff")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.samplePacks")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.restaurantRetailAndOperationsWorkflowDemoTenants")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.demoFlow")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.testTenantCreationThroughOwnerAcceptanceAndOpen")}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("settings.testTenant")}</span>
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
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.expectedRecordsAndSignoffChecksAreDefinedFor")}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">{t("settings.connectionActivity")}</h3>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>{t("inventory.provider")}</TableHead>
                <TableHead>{t("schedule.status")}</TableHead>
                <TableHead>{t("settings.connected")}</TableHead>
                <TableHead>{t("settings.lastSync")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.connections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground"
                  >{t("settings.noConnectionsYet")}</TableCell>
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
          <span>{t("settings.adjustAutoSyncRulesAndMappingsAsIntegrations")}</span>
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
          >{t("settings.refreshMappings")}</Button>
        </div>

        {saveError && <ErrorState message={saveError.message} />}

        {activeProvider && (
          <Dialog open onOpenChange={() => setActiveProvider(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect {activeProvider.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t("settings.rawApiKeysAreNeverStoredInBrowser")}</p>
              {activeProvider.authType === "api_key" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("settings.apiKey")}</label>
                    <Input
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder={t("settings.pasteApiKey")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("schedule.notes")}</label>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      placeholder={t("settings.optionalContextForTeammates")}
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
                >{t("common.cancel")}</Button>
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
