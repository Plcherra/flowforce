import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useManagerFinancialMetrics } from '@/hooks/useFinancialManagement';
import { useSystemSettings } from '@/modules/system/hooks/useSystemSettings';
import { useIntegrationSettings } from '@/modules/system/hooks/useIntegrationSettings';
import { useToast } from '@/hooks/use-toast';
import { generateFinancialDemoData } from '@/services/financialDemoData';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Factory,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type IntegrationId = 'toast' | 'quickbooks' | 'marketman';

const INTEGRATION_META: Array<{
  id: IntegrationId;
  name: string;
  description: string;
  defaultAutoSync: boolean;
}> = [
  {
    id: 'toast',
    name: 'Toast POS',
    description: 'Sync hours worked and labor cost data directly from Toast.',
    defaultAutoSync: true,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Push payroll and expense records for accounting reconciliation.',
    defaultAutoSync: false,
  },
  {
    id: 'marketman',
    name: 'MarketMan',
    description: 'Import food cost, inventory, and waste adjustments automatically.',
    defaultAutoSync: true,
  },
];

const loadingSkeleton = (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, idx) => (
        <Skeleton key={idx} className="h-32 w-full rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-80 w-full rounded-xl" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  </div>
);

const statusStyleMap: Record<
  'connected' | 'pending' | 'disconnected' | 'error',
  { label: string; className: string }
> = {
  connected: { label: 'Connected', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  disconnected: { label: 'Disconnected', className: 'bg-rose-100 text-rose-700' },
  error: { label: 'Error', className: 'bg-rose-100 text-rose-700' },
};

const formatCategoryLabel = (label: string) =>
  label
    .replace(/_/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getUuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export function ManagerFinancialOverview() {
  const metrics = useManagerFinancialMetrics();
  const system = useSystemSettings();
  const {
    integrations: integrationSettings,
    updateIntegrations,
    loading: integrationLoading,
    canEdit,
  } = useIntegrationSettings(system);
  const settingsLoading = system.loading || integrationLoading;
  const { toast } = useToast();

  const [autoSyncBusy, setAutoSyncBusy] = useState<IntegrationId | null>(null);
  const [syncingIntegration, setSyncingIntegration] = useState<IntegrationId | null>(null);
  const [seeding, setSeeding] = useState(false);

  const autoSyncMap = useMemo(() => {
    const raw = integrationSettings?.syncMappings?.autoSync;
    const resolved: Record<string, boolean> = {};
    if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          resolved[key] = value;
        }
      });
    }
    return INTEGRATION_META.reduce<Record<IntegrationId, boolean>>((acc, meta) => {
      acc[meta.id] = resolved[meta.id] ?? meta.defaultAutoSync;
      return acc;
    }, {} as Record<IntegrationId, boolean>);
  }, [integrationSettings?.syncMappings]);

  const integrationMetaById = useMemo(
    () => Object.fromEntries(INTEGRATION_META.map(meta => [meta.id, meta])),
    [],
  );

  const integrationCards = useMemo(
    () =>
      INTEGRATION_META.map(meta => {
        const provider = integrationSettings?.providers?.[meta.id];
        const connection = integrationSettings?.connections?.find(
          candidate => candidate.provider === meta.id,
        );
        const status = (provider?.status ?? 'disconnected') as keyof typeof statusStyleMap;
        const lastSync = connection?.lastSyncedAt ?? integrationSettings?.lastSyncedAt ?? null;

        return {
          ...meta,
          status,
          lastSync,
          autoSync: autoSyncMap[meta.id],
        };
      }),
    [integrationSettings, autoSyncMap],
  );

  const chartData = useMemo(
    () =>
      metrics.profitLossTrend.map(point => ({
        month: point.monthLabel,
        revenue: point.revenue,
        costs:
          point.payroll + point.operatingExpenses + point.wasteImpact + point.inventoryPurchases,
        profit: point.profit,
      })),
    [metrics.profitLossTrend],
  );

  const totalExpenseBreakdown = useMemo(
    () => metrics.expenseBreakdown.reduce((sum, item) => sum + item.total, 0),
    [metrics.expenseBreakdown],
  );

  const netInventory = metrics.inventorySales30d - metrics.inventoryPurchase30d;
  const inventoryTrendPositive = netInventory >= 0;

  const handleToggleAutoSync = async (id: IntegrationId, value: boolean) => {
    if (!integrationSettings) return;
    setAutoSyncBusy(id);
    try {
      await updateIntegrations({
        syncMappings: {
          ...integrationSettings.syncMappings,
          autoSync: {
            ...autoSyncMap,
            [id]: value,
          },
        },
      });

      toast({
        title: value ? 'Auto-sync enabled' : 'Auto-sync disabled',
        description: `Integration '${integrationMetaById[id]?.name ?? id}' will ${
          value ? 'sync automatically' : 'require manual sync'
        } going forward.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to update auto-sync',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAutoSyncBusy(null);
    }
  };

  const handleManualSync = async (id: IntegrationId) => {
    if (!integrationSettings) return;
    setSyncingIntegration(id);
    const providerConfig = integrationSettings.providers?.[id];
    const existingConnection = integrationSettings.connections?.find(
      connection => connection.provider === id,
    );
    const nowIso = new Date().toISOString();
    const connectionId = existingConnection?.id ?? getUuid();

    try {
      await updateIntegrations({
        providers: {
          [id]: {
            status: 'connected',
            authType: providerConfig?.authType ?? 'api_key',
          },
        },
        connections: [
          {
            id: connectionId,
            provider: id,
            status: 'connected',
            authType: providerConfig?.authType ?? 'api_key',
            connectedAt: existingConnection?.connectedAt ?? nowIso,
            lastSyncedAt: nowIso,
            metadata: {
              ...(existingConnection?.metadata ?? {}),
              manualSyncAt: nowIso,
            },
          },
        ],
        lastSyncedAt: nowIso,
        syncMappings: {
          ...integrationSettings.syncMappings,
          autoSync: {
            ...autoSyncMap,
          },
        },
      });

      toast({
        title: 'Sync started',
        description: `Triggered data synchronization for ${integrationMetaById[id]?.name ?? id}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Sync failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSyncingIntegration(null);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const result = await generateFinancialDemoData();
      await metrics.refresh();

      const created: string[] = [];
      if (result.paymentsInserted) created.push(`${result.paymentsInserted} payments`);
      if (result.expensesInserted) created.push(`${result.expensesInserted} expenses`);
      if (result.transactionsInserted) created.push(`${result.transactionsInserted} inventory transactions`);

      const parts: string[] = [];
      if (result.alreadySeeded && created.length === 0) {
        parts.push('Demo financial records already exist for this workspace.');
      } else if (created.length) {
        parts.push(`Inserted ${created.join(', ')}.`);
      } else {
        parts.push('No financial data was added.');
      }

      if (result.skippedTransactions) {
        parts.push(result.skippedTransactions);
      }

      toast({
        title: 'Demo financial data ready',
        description: parts.join(' '),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to generate demo data',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  if (metrics.loading || settingsLoading) {
    return loadingSkeleton;
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="flex justify-end">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleSeedDemoData}
                  disabled={seeding || metrics.refreshing}
                >
                  {seeding ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  )}
                  Generate Sample Data
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Prefill demo payroll, expenses, and inventory transactions to validate analytics.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Briefcase className="h-4 w-4 text-primary" />
                Payroll (30 days)
              </CardTitle>
              <CardDescription>Gross compensation processed</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Forecast ${metrics.profitForecastNextMonth.toFixed(0)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">
              ${metrics.payrollTotal30d.toFixed(2)}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Approved ${metrics.payrollApproved.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Building2 className="h-4 w-4 text-primary" />
                Operating Spend
              </CardTitle>
              <CardDescription>Expenses & reimbursements (30 days)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">
              ${metrics.operatingExpenses30d.toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Vendor payments</span>
              <span>${metrics.vendorSpending30d.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Reimbursements</span>
              <span>${metrics.reimbursementVolume30d.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Factory className="h-4 w-4 text-primary" />
                Labor & Waste
              </CardTitle>
              <CardDescription>Labor cost this week & waste impact</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold">
                ${metrics.laborCostThisWeek.toFixed(2)}
              </span>
              <Badge variant="secondary" className="text-xs">
                Waste ${metrics.wasteCost30d.toFixed(2)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Waste data combines MarketMan and internal inventory adjustments.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Store className="h-4 w-4 text-primary" />
                Sales vs Purchasing
              </CardTitle>
              <CardDescription>Inventory transactions (30 days)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold">
                ${metrics.inventorySales30d.toFixed(2)}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${inventoryTrendPositive ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {inventoryTrendPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                Net {inventoryTrendPositive ? '+' : ''}
                {netInventory.toFixed(2)}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Purchases</span>
              <span>${metrics.inventoryPurchase30d.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Profit & Loss Overview</CardTitle>
              <CardDescription>Combines revenue, labor, operating, and waste costs</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              Forecast next month ${metrics.profitForecastNextMonth.toFixed(2)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip
                formatter={(value: number, name: string) =>
                  [`$${value.toFixed(2)}`, name.toUpperCase()]
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                fill="#2563eb22"
                stroke="#2563eb"
                strokeWidth={2}
              />
              <Bar dataKey="costs" barSize={24} fill="#f97316cc" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Expense Breakdown</CardTitle>
            <CardDescription>
              Shipping, utilities, purchasing, and other tracked categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.expenseBreakdown.slice(0, 6).map(item => {
              const ratio =
                totalExpenseBreakdown === 0 ? 0 : (item.total / totalExpenseBreakdown) * 100;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{formatCategoryLabel(item.label)}</span>
                    <span>${item.total.toFixed(2)}</span>
                  </div>
                  <Progress value={ratio} className="h-2" />
                </div>
              );
            })}
            {metrics.expenseBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expense activity recorded in the last 30 days.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Approvals Queue</CardTitle>
            <CardDescription>Manage expense and payroll approvals for your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-3">
              <div>
                <p className="text-sm font-medium">Payroll Approvals</p>
                <p className="text-sm text-muted-foreground">
                  ${metrics.payrollPendingApproval.toFixed(2)} awaiting review
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {metrics.payrollPendingApprovalCount} items
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-3">
              <div>
                <p className="text-sm font-medium">Expense Approvals</p>
                <p className="text-sm text-muted-foreground">
                  ${metrics.pendingExpenseTotal.toFixed(2)} pending reimbursement
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {metrics.pendingExpenseCount} items
              </Badge>
            </div>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Open approval workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Navigate to Payments and Expenses tabs to approve items.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">External Integrations</CardTitle>
              <CardDescription>
                Automate synchronization with Toast, QuickBooks, and MarketMan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrationCards.map(integration => {
            const statusStyle =
              statusStyleMap[integration.status] ?? statusStyleMap.disconnected;
            const lastSynced =
              integration.lastSync != null
                ? new Date(integration.lastSync).toLocaleString()
                : 'No sync history yet';

            return (
              <div
                key={integration.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold">{integration.name}</h3>
                    <Badge className={`text-xs ${statusStyle.className}`} variant="outline">
                      {statusStyle.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                  <p className="text-xs text-muted-foreground">{lastSynced}</p>
                </div>
                <div className="flex flex-col gap-3 md:w-56">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Auto-sync</span>
                    <Switch
                      checked={integration.autoSync}
                      onCheckedChange={value => handleToggleAutoSync(integration.id, value)}
                      disabled={
                        !canEdit ||
                        autoSyncBusy === integration.id ||
                        integrationSettings == null
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleManualSync(integration.id)}
                    disabled={
                      !canEdit ||
                      syncingIntegration === integration.id ||
                      integrationSettings == null
                    }
                  >
                    {syncingIntegration === integration.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sync now
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
