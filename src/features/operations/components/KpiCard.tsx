import { useTranslation } from "react-i18next";
import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPercent,
  formatSignedPoints,
  type HubKpiKey,
  type KpiResult,
} from "../utils/operationsHubMetrics";

const TITLE_KEYS: Record<HubKpiKey, string> = {
  tasks_compliance: "operations.hubTaskCompliance",
  inventory_health: "operations.hubInventoryHealth",
  labor_vs_sales: "operations.hubLaborVsSales",
};

interface KpiCardProps {
  kpiKey: HubKpiKey;
  loading: boolean;
  failed: boolean;
  result: KpiResult | null;
}

function detailKey(kpiKey: HubKpiKey, result: KpiResult): string {
  if (kpiKey === "tasks_compliance") {
    return result.available
      ? "operations.hubTaskComplianceDetail"
      : "operations.hubTaskComplianceEmpty";
  }
  if (kpiKey === "inventory_health") {
    return result.available
      ? "operations.hubInventoryHealthDetail"
      : "operations.hubInventoryHealthEmpty";
  }
  if (result.laborBasis === "recorded") return "operations.hubLaborVsSalesRecordedDetail";
  if (result.emptyReason === "no_labor") return "operations.hubLaborVsSalesNoLabor";
  if (result.emptyReason === "no_labor_rate") return "operations.hubLaborVsSalesNoRate";
  if (result.emptyReason === "no_sales") return "operations.hubLaborVsSalesNoSales";
  return "operations.hubLaborVsSalesDetail";
}

export function KpiCard({
  kpiKey,
  loading,
  failed,
  result,
}: KpiCardProps) {
  const { t } = useTranslation();
  const title = t(TITLE_KEYS[kpiKey]);

  if (loading) {
    return <Skeleton className="h-44 w-full rounded-3xl" />;
  }

  const valueLabel =
    !failed && result?.available && result.percent != null
      ? formatPercent(result.percent)
      : null;
  const trendLabel =
    failed || result?.trendPoints == null
      ? null
      : t("operations.hubPointsTrend", {
          delta: formatSignedPoints(result.trendPoints),
        });
  const detail = failed
    ? t("operations.hubCouldNotLoad")
    : result
      ? t(detailKey(kpiKey, result))
      : t("operations.hubNoCompany");
  const severity = result?.available ? result.severity : null;
  const severityLabel =
    severity === "critical"
      ? t("operations.hubSeverityCritical")
      : severity === "warning"
        ? t("operations.hubSeverityWarning")
        : severity === "normal"
          ? t("operations.hubSeverityNormal")
          : null;
  const showProgress = Boolean(result?.available && valueLabel);

  return (
    <motion.div
      layout
      data-testid={`operations-kpi-${kpiKey}`}
      className="min-w-0 rounded-3xl border bg-background/95 p-4 shadow-sm"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground sm:tracking-[0.3em]">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {valueLabel ?? t("common.notAvailable")}
          </p>
          {trendLabel ? (
            <p className="text-sm text-muted-foreground">{trendLabel}</p>
          ) : null}
        </div>
        {severityLabel ? (
          <Badge
            variant={severity === "critical" ? "destructive" : "outline"}
            className="shrink-0"
          >
            {severityLabel}
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>

      {showProgress && valueLabel ? (
        <Progress
          value={Math.max(0, Math.min(result?.percent ?? 0, 100))}
          aria-label={valueLabel}
          className="mt-4 w-full"
        />
      ) : null}
    </motion.div>
  );
}
