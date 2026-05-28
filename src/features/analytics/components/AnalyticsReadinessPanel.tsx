import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Download,
  FileBarChart2,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessAnalytics } from "@/hooks/useBusinessAnalytics";
import { useCompany } from "@/hooks/useCompany";
import { useDocumentInbox } from "@/hooks/useDocumentIngestion";
import { useProfile } from "@/hooks/useProfile";
import { useForms } from "@/features/forms/hooks/useForms";
import { exportAnalyticsReadiness } from "@/features/analytics/utils/exportHelpers";
import {
  buildAnalyticsReadinessSummary,
  resolveAnalyticsViewMode,
  type AnalyticsViewMode,
} from "@/features/analytics/utils/analyticsReadiness";

const statusTone: Record<string, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
  watch:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  blocked: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
};

const reviewTone: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100",
};

export function AnalyticsReadinessPanel() {
  const { company } = useCompany();
  const { profile } = useProfile();
  const companyId = company?.id ?? profile?.companyId ?? profile?.company_id ?? null;
  const defaultView = resolveAnalyticsViewMode(profile?.role);
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>(defaultView);
  const businessQuery = useBusinessAnalytics({ companyId, horizonDays: 28 });
  const { forms } = useForms();
  const { data: documents = [] } = useDocumentInbox({
    limit: 100,
    companyId: companyId ?? undefined,
  });

  const summary = useMemo(
    () =>
      buildAnalyticsReadinessSummary({
        viewMode,
        business: businessQuery.data,
        forms,
        documents,
      }),
    [businessQuery.data, documents, forms, viewMode],
  );

  const healthCards = [
    {
      label: "Live data",
      value: summary.liveDataReady ? "Ready" : "Fallback",
      detail: businessQuery.data?.notice ?? "Tenant-scoped module data",
      icon: ShieldCheck,
    },
    {
      label: "Exports",
      value: summary.exportReady ? "Ready" : "Thin",
      detail: "CSV-ready owner and manager metrics",
      icon: Download,
    },
    {
      label: "Cost engine",
      value: summary.costEngineReady ? "Connected" : "Needs signal",
      detail: "Labor, revenue, inventory, expenses",
      icon: Gauge,
    },
    {
      label: "AI insights",
      value: summary.aiReady ? "Contextual" : "Limited",
      detail: "Assistant receives current report context",
      icon: Bot,
    },
  ];

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileBarChart2 className="h-5 w-5 text-primary" />
              Analytics Readiness
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Real module summaries, owner/manager views, exports, cost signals, and AI context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border bg-muted/30 p-1">
              {(["owner", "manager"] as AnalyticsViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="h-8 capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => exportAnalyticsReadiness(summary)}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {healthCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-lg border border-border/70 bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {item.value}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.metrics.map((metric) => (
            <div
              key={metric.id}
              className={`rounded-lg border p-3 ${statusTone[metric.status]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{metric.label}</p>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {metric.status}
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
              <p className="text-xs opacity-80">{metric.detail}</p>
            </div>
          ))}
        </div>

        {summary.reviewItems.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Reporting review needed</AlertTitle>
            <AlertDescription>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {summary.reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-md border px-3 py-2 text-sm ${reviewTone[item.severity]}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.severity}
                      </Badge>
                    </span>
                    <span className="mt-1 block">{item.detail}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            Analytics is using tenant data with exports, cost signals, and AI context available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
