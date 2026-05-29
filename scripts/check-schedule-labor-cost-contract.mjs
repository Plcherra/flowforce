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

const doc = readText("docs/schedule-labor-cost.md");
const calculator = readText("src/services/costing/scheduleLabor.ts");
const dashboard = readText(
  "src/features/dashboard/hooks/useOperatorCommandCenterData.ts",
);
const migration = readText(
  "supabase/migrations/20260528000700_phase5_schedule_labor_cost.sql",
);
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");

requireIncludes(
  doc,
  [
    "cost_schedule_labor_v",
    "cost_schedule_labor_breakdown_v",
    "get_schedule_labor_cost",
    "planned_labor_cost",
    "labor_entries",
    "actual labor imports",
  ],
  "schedule labor cost doc",
);

requireIncludes(
  calculator,
  [
    "calculateNetShiftHours",
    "calculateScheduleLaborCost",
    "plannedLaborHours",
    "plannedLaborCost",
    "hourlyRateSource",
    "missingCostBasis",
  ],
  "schedule labor calculator",
);

requireIncludes(
  dashboard,
  [
    "calculateScheduleLaborCost",
    "plannedLaborHours",
    "plannedLaborCost",
    "requirements",
  ],
  "operator command center labor calculation",
);

requireIncludes(
  migration,
  [
    "alter table public.labor_entries add column if not exists user_id",
    "set_labor_entry_company_id",
    "Company members can manage labor entries",
    "create or replace view public.cost_schedule_labor_v",
    "create or replace view public.cost_schedule_labor_breakdown_v",
    "create or replace function public.get_schedule_labor_cost",
    "cost_basis_status",
    "security_invoker",
  ],
  "schedule labor migration",
);

requireIncludes(
  roadmap,
  [
    "Connect scheduled shifts to pay rates or labor estimates.",
    "Calculate planned labor cost.",
    "Calculate role/department/location labor breakdown.",
    "Prepare actual labor import path.",
    "05.07 Labor And Schedule Cost",
    "docs/schedule-labor-cost.md",
  ],
  "roadmap phase 05.07",
);

if (roadmap.includes("- [ ] Connect scheduled shifts to pay rates or labor estimates.")) {
  throw new Error("roadmap phase 05.07 still has unchecked tasks");
}

requireIncludes(
  checklist,
  ["[x] Schedule labor cost rollups are tenant-scoped."],
  "launch checklist",
);

process.stdout.write("OK schedule labor cost contract\n");
