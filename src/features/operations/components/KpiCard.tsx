import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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

const SUGGESTION_TITLE_KEYS: Record<HubKpiKey, string> = {
  tasks_compliance: "operations.hubSuggestionTitleTasks",
  inventory_health: "operations.hubSuggestionTitleInventory",
  labor_vs_sales: "operations.hubSuggestionTitleLabor",
};

const SUGGESTION_SUMMARY_KEYS: Record<HubKpiKey, string> = {
  tasks_compliance: "operations.hubSuggestionSummaryTasks",
  inventory_health: "operations.hubSuggestionSummaryInventory",
  labor_vs_sales: "operations.hubSuggestionSummaryLabor",
};

interface KpiCardProps {
  kpiKey: HubKpiKey;
  loading: boolean;
  failed: boolean;
  result: KpiResult | null;
  saving: boolean;
  onSuggest: (input: {
    kpiKey: HubKpiKey;
    title: string;
    summary: string;
    valueLabel: string;
  }) => Promise<void>;
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
  saving,
  onSuggest,
}: KpiCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
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
  const canSuggest = Boolean(result?.available && valueLabel);

  async function generate() {
    if (!valueLabel) return;
    setDrawerError(null);
    try {
      await onSuggest({
        kpiKey,
        title: t(SUGGESTION_TITLE_KEYS[kpiKey]),
        summary: t(SUGGESTION_SUMMARY_KEYS[kpiKey], { value: valueLabel }),
        valueLabel,
      });
      setOpen(false);
      toast({
        title: t("operations.generateSuggestionSaved"),
      });
    } catch (error) {
      setDrawerError(
        error instanceof Error && error.message
          ? error.message
          : t("operations.generateSuggestionFailed"),
      );
    }
  }

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

      {canSuggest && valueLabel ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Progress
            value={Math.max(0, Math.min(result?.percent ?? 0, 100))}
            aria-label={valueLabel}
            className="w-full"
          />
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
              >
                {t("operations.fixAutomatically")}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{t("operations.suggestAutomation")}</DrawerTitle>
                <DrawerDescription>
                  {t("operations.hubSuggestionBody", { metric: title })}
                </DrawerDescription>
              </DrawerHeader>
              <div className="space-y-3 px-4 pb-4 text-sm">
                <p>
                  {t("operations.hubCurrentValue", {
                    metric: title,
                    value: valueLabel,
                  })}
                </p>
                {trendLabel ? <p>{trendLabel}</p> : null}
                {drawerError ? (
                  <p className="text-destructive">{drawerError}</p>
                ) : null}
              </div>
              <DrawerFooter>
                <Button disabled={saving} onClick={() => void generate()}>
                  {t("operations.generateSuggestion")}
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost">{t("common.cancel")}</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      ) : null}
    </motion.div>
  );
}
