import React, { useMemo, useState } from "react";
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

export type KpiKey = "tasks_compliance" | "inventory_health" | "labor_vs_sales";

export interface KpiSnapshot {
  kpiKey: KpiKey;
  label: string;
  valueLabel: string;
  trendLabel: string;
  severity?: "normal" | "warning" | "critical";
  description?: string;
}

const MOCK_KPI_DATA: Record<KpiKey, KpiSnapshot> = {
  tasks_compliance: {
    kpiKey: "tasks_compliance",
    label: "Task Compliance",
    valueLabel: "92%",
    trendLabel: "+4% WoW",
    severity: "normal",
    description: "Percentage of scheduled frontline tasks completed on time.",
  },
  inventory_health: {
    kpiKey: "inventory_health",
    label: "Inventory Health",
    valueLabel: "78%",
    trendLabel: "-3% WoW",
    severity: "warning",
    description: "Composite score based on low stock alerts and shrinkage.",
  },
  labor_vs_sales: {
    kpiKey: "labor_vs_sales",
    label: "Labor vs Sales",
    valueLabel: "31.4%",
    trendLabel: "+1.1 pts",
    severity: "critical",
    description: "Labor cost percentage against net sales for the last 7 days.",
  },
};

function useMockKpiSnapshot(kpiKey: KpiKey): KpiSnapshot {
  return useMemo(() => MOCK_KPI_DATA[kpiKey], [kpiKey]);
}

const severityVariants: Record<NonNullable<KpiSnapshot["severity"]>, string> = {
  normal: "text-emerald-600",
  warning: "text-amber-600",
  critical: "text-red-600",
};

interface KpiCardProps {
  kpiKey: KpiKey;
}

export function KpiCard({ kpiKey }: KpiCardProps) {
  const snapshot = useMockKpiSnapshot(kpiKey);
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      className="rounded-3xl border bg-background/95 p-4 shadow-sm"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {snapshot.label}
          </p>
          <p className="mt-2 text-3xl font-semibold">{snapshot.valueLabel}</p>
          <p className="text-sm text-muted-foreground">{snapshot.trendLabel}</p>
        </div>
        {snapshot.severity && (
          <Badge
            variant={snapshot.severity === "normal" ? "outline" : "destructive"}
          >
            {snapshot.severity}
          </Badge>
        )}
      </div>
      {snapshot.description && (
        <p className="mt-3 text-sm text-muted-foreground">
          {snapshot.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Progress
          value={
            snapshot.severity === "critical"
              ? 35
              : snapshot.severity === "warning"
                ? 65
                : 90
          }
        />
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-3 whitespace-nowrap"
            >
              Fix automatically
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Suggest automation</DrawerTitle>
              <DrawerDescription>
                FlowForce will design a script to stabilize{" "}
                {snapshot.label.toLowerCase()}.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-3 px-4 pb-4 text-sm">
              <p>
                Trend:{" "}
                <span
                  className={
                    snapshot.severity ? severityVariants[snapshot.severity] : ""
                  }
                >
                  {snapshot.trendLabel}
                </span>
              </p>
              <p>
                The automation generator will craft a task sequence,
                notifications, and database inserts conforming to the
                Auto-Script DSL. You will be able to review before execution.
              </p>
            </div>
            <DrawerFooter>
              <Button onClick={() => setOpen(false)}>
                Generate suggestion
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </motion.div>
  );
}
