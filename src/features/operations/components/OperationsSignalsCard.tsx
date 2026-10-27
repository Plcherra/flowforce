import { useTranslation } from "react-i18next";
import React from "react";
import { AlertTriangle, ArrowUpRight, Layers, TrendingDown } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/shared/utils/currencyHelpers";
import {
  formatPercent,
  formatSignedPoints,
  type OperationsHubModel,
} from "../utils/operationsHubMetrics";

interface OperationsSignalsCardProps {
  loading: boolean;
  currency: string;
  countsFailed: boolean;
  stockFailed: boolean;
  wasteFailed: boolean;
  model: OperationsHubModel | null;
}

export function OperationsSignalsCard({
  loading,
  currency,
  countsFailed,
  stockFailed,
  wasteFailed,
  model,
}: OperationsSignalsCardProps) {
  const { t } = useTranslation();
  const lowStock = model?.lowStock ?? [];
  const shown = lowStock.slice(0, 3);

  return (
    <div
      data-testid="operations-signals"
      className="min-w-0 rounded-3xl border bg-background/95 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground sm:tracking-[0.4em]">
            {t("operations.opsWidgets")}
          </p>
          <h3 className="text-lg font-semibold">{t("operations.realtimeSignals")}</h3>
          <p className="text-sm text-muted-foreground">{t("operations.hubSignalsIntro")}</p>
        </div>
        <Layers className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <SignalBlock
            label={t("operations.countsDue")}
            value={
              countsFailed
                ? t("operations.hubCouldNotLoad")
                : model && model.countsDue.count > 0
                  ? model.countsDue.count === 1
                    ? t("operations.countsDueValueOne")
                    : t("operations.countsDueValue", { count: model.countsDue.count })
                  : t("operations.countsDueEmpty")
            }
            detail={
              model && model.countsDue.locations.length > 0
                ? model.countsDue.locations.join(", ")
                : model && model.countsDue.count > 0
                  ? t("operations.countsDueNoLocation")
                  : null
            }
          />
          <SignalBlock
            label={t("operations.hubLowStock")}
            value={
              stockFailed
                ? t("operations.hubCouldNotLoad")
                : lowStock.length > 0
                  ? lowStock.length === 1
                    ? t("operations.hubLowStockValueOne")
                    : t("operations.hubLowStockValue", { count: lowStock.length })
                  : t("operations.hubLowStockEmpty")
            }
            detail={
              shown.length > 0
                ? t("operations.hubLowStockNames", {
                    names: shown
                      .map((item) => item.name ?? t("operations.hubUnnamedItem"))
                      .join(", "),
                  })
                : null
            }
            icon={lowStock.length > 0 ? AlertTriangle : undefined}
            tone={lowStock.length > 0 ? "text-warning" : "text-foreground"}
          />
          <WasteBlock
            failed={wasteFailed}
            model={model}
            currency={currency}
          />
        </div>
      )}

      {shown.length > 0 ? (
        <div className="mt-5 space-y-3">
          {shown.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-dashed border-border/70 p-3"
            >
              <div className="flex items-center justify-between gap-3 text-sm font-medium">
                <span className="min-w-0 break-words">
                  {item.name ?? t("operations.hubUnnamedItem")}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {t("operations.hubShortageLevel", {
                    percent: formatPercent(item.percentOfMinimum),
                  })}
                </span>
              </div>
              {item.locationName ? (
                <p className="text-xs text-muted-foreground">
                  {t("operations.hubAtLocation", { location: item.locationName })}
                </p>
              ) : null}
              <Progress
                value={Math.max(0, Math.min(item.percentOfMinimum, 100))}
                className="mt-2 h-2 rounded-full bg-muted"
              />
            </div>
          ))}
        </div>
      ) : null}

      <Button asChild className="mt-4 w-full gap-2" variant="outline">
        <Link to="/app/inventory">
          {t("messages.openInventory")} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function SignalBlock({
  label,
  value,
  detail,
  icon: Icon,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  detail: string | null;
  icon?: typeof AlertTriangle;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? <Icon className={`h-4 w-4 ${tone}`} /> : null}
      </div>
      <p className={`text-xl font-semibold ${tone}`}>{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function WasteBlock({
  failed,
  model,
  currency,
}: {
  failed: boolean;
  model: OperationsHubModel | null;
  currency: string;
}) {
  const { t } = useTranslation();
  const waste = model?.waste;
  let value = t("operations.hubWasteEmpty");
  let detail: string | null = null;
  if (failed) {
    value = t("operations.hubCouldNotLoad");
  } else if (waste?.kind === "trend" && waste.percentChange != null) {
    value = `${formatSignedPoints(waste.percentChange)}%`;
    detail = t("operations.hubWasteVersusPrevious");
  } else if (waste?.kind === "amount" && waste.cost != null) {
    value = formatCurrency(waste.cost, currency);
    detail = t("operations.hubWasteThisWeek");
  }

  return (
    <SignalBlock
      label={t("operations.hubWaste")}
      value={value}
      detail={detail}
      icon={waste?.kind === "trend" ? TrendingDown : undefined}
      tone={
        waste?.kind === "trend" && (waste.percentChange ?? 0) < 0
          ? "text-success"
          : "text-foreground"
      }
    />
  );
}
