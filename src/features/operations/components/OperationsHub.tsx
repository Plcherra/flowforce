import { useTranslation } from "react-i18next";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Layers } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { IssuesStream } from "./IssuesStream";
import { AutomationsPanel } from "./AutomationsPanel";
import { SopChecklistBuilderPanel } from "./SopChecklistBuilderPanel";
import { RecurringOperationsCalendarPanel } from "./RecurringOperationsCalendarPanel";
import { FieldExecutionPanel } from "./FieldExecutionPanel";
import { ManagerReviewQueuePanel } from "./ManagerReviewQueuePanel";
import { CompliancePacksPanel } from "./CompliancePacksPanel";
import { WorkflowAutomationHooksPanel } from "./WorkflowAutomationHooksPanel";
import { ExecutionQualityPanel } from "./ExecutionQualityPanel";
import { InventorySignalWidget } from "@/features/messages/components/ops/InventorySignalWidget";

const kpiKeys: Array<Parameters<typeof KpiCard>[0]["kpiKey"]> = [
  "tasks_compliance",
  "inventory_health",
  "labor_vs_sales",
];

export function OperationsHub() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-muted/30 py-4">
      <div className="flex w-full max-w-none flex-col gap-4 px-3 sm:px-4">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border bg-background/95 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> {t("shell.flowforce")}
              </div>
              <h1 className="mt-2 text-3xl font-semibold">{t("operations.operationsHub")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("operations.kpisLiveIssuesAndAutomationDraftsInOneMinimalistBoard")}
              </p>
            </div>
            <div className="hidden text-sm text-muted-foreground lg:flex lg:flex-col lg:items-end">
              <span>{t("operations.updatedEvery15Min")}</span>
              <span className="text-xs uppercase tracking-[0.4em]">
                {t("operations.flowforceOperations")}
              </span>
            </div>
          </div>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {kpiKeys.map((key) => (
            <KpiCard key={key} kpiKey={key} />
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,32rem)]"
        >
          <div className="min-w-0">
            <IssuesStream />
          </div>
          <div className="min-w-0">
            <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                    {t("operations.opsWidgets")}
                  </p>
                  <h3 className="text-lg font-semibold">{t("operations.realtimeSignals")}</h3>
                </div>
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 space-y-4">
                <InventorySignalWidget />
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <SopChecklistBuilderPanel />
          <RecurringOperationsCalendarPanel />
          <FieldExecutionPanel />
          <ManagerReviewQueuePanel />
          <CompliancePacksPanel />
          <WorkflowAutomationHooksPanel />
          <ExecutionQualityPanel />
          <AutomationsPanel />
        </section>
      </div>
    </div>
  );
}
