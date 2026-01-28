import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Layers } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { IssuesStream } from "./IssuesStream";
import { AutomationsPanel } from "./AutomationsPanel";
import { InventorySignalWidget } from "@/features/messages/components/ops/InventorySignalWidget";

const kpiKeys: Array<Parameters<typeof KpiCard>[0]["kpiKey"]> = [
  "tasks_compliance",
  "inventory_health",
  "labor_vs_sales",
];

export function OperationsHub() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-0">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border bg-background/95 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> FlowForce
              </div>
              <h1 className="mt-2 text-3xl font-semibold">Operations Hub</h1>
              <p className="text-sm text-muted-foreground">
                KPIs, live issues, and automation drafts in one minimalist
                board.
              </p>
            </div>
            <div className="hidden text-sm text-muted-foreground lg:flex lg:flex-col lg:items-end">
              <span>Updated every 15 min</span>
              <span className="text-xs uppercase tracking-[0.4em]">
                Chronique + FlowForce
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
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <IssuesStream />
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                    Ops Widgets
                  </p>
                  <h3 className="text-lg font-semibold">Realtime Signals</h3>
                </div>
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 space-y-4">
                <InventorySignalWidget />
              </div>
            </div>
            <AutomationsPanel />
          </div>
        </motion.section>
      </div>
    </div>
  );
}
