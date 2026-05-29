import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const doc = readText("docs/unified-shift-profitability.md");
const migration = readText(
  "supabase/migrations/20260528000800_phase5_unified_shift_profitability.sql",
);
const dashboardHook = readText(
  "src/features/dashboard/hooks/useOperatorCommandCenterData.ts",
);
const dashboardCard = readText(
  "src/features/dashboard/components/OperatorCommandCenter.tsx",
);
const reports = readText("src/hooks/useReports.tsx");
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");

requireIncludes(
  doc,
  [
    "cost_day_location_summary_v",
    "cost_shift_summary_v",
    "get_cost_engine_summary",
    "get_shift_cost_breakdown",
    "shortage",
    "overstaffed",
  ],
  "unified shift profitability doc",
);

requireIncludes(
  migration,
  [
    "create or replace view public.cost_production_batches_v",
    "create or replace view public.cost_inventory_shortage_v",
    "create or replace view public.cost_day_location_summary_v",
    "create or replace view public.cost_shift_summary_v",
    "create or replace function public.get_cost_engine_summary",
    "create or replace function public.get_shift_cost_breakdown",
    "total_operating_cost",
    "staffing_signal",
    "inventory_signal",
    "security_invoker",
  ],
  "unified shift profitability migration",
);

requireIncludes(
  dashboardHook,
  [
    "get_cost_engine_summary",
    "totalOperatingCostToday",
    "productionCostToday",
    "wasteCostToday",
    "shortageSignalsToday",
    "overstaffedShiftsToday",
  ],
  "operator command center hook",
);

requireIncludes(
  dashboardCard,
  [
    "totalOperatingCostToday",
    "wasteCostToday",
    "productionCostToday",
    "overstaffedShiftsToday",
    "Today&apos;s labor, production, waste, purchasing, and",
  ],
  "operator command center cards",
);

requireIncludes(
  reports,
  ["shift_profitability", "cost_engine", "cost_day_location_summary_v"],
  "reports data mapping",
);

requireIncludes(
  roadmap,
  [
    "Combine labor, inventory, production, waste, purchases, and expenses.",
    "Add shift/day/location cost summaries.",
    "Add upcoming shortage and overstaffing signals.",
    "Add dashboard cards and reports.",
    "05.08 Unified Shift Profitability",
    "docs/unified-shift-profitability.md",
  ],
  "roadmap phase 05.08",
);

if (
  roadmap.includes(
    "- [ ] Combine labor, inventory, production, waste, purchases, and expenses.",
  )
) {
  throw new Error("roadmap phase 05.08 still has unchecked tasks");
}

requireIncludes(
  checklist,
  ["[x] Shift/day/location profitability summaries are available."],
  "launch checklist",
);

process.stdout.write("OK unified shift profitability contract\n");
