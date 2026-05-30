import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

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

const doc = readText("docs/mobile-core-workflows.md");
const report = readText(
  "docs/roadmap/reports/08-05-mobile-core-workflows-2026-05-30.md",
);
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText("src/services/mobile/mobileCoreWorkflows.ts");
const dashboardActions = readText(
  "src/features/dashboard/components/MobileCoreWorkflowActions.tsx",
);
const dashboardPage = readText("src/features/dashboard/pages/Dashboard.tsx");
const routeInventory = JSON.parse(
  readText("src/app-shell/navigation/moduleRouteInventory.json"),
);
const smokeReport = JSON.parse(
  readText("docs/test-results/visible-modules-smoke.json"),
);
const packageJson = readText("package.json");

requireIncludes(
  doc,
  [
    "Dashboard",
    "Schedule",
    "Tasks",
    "Messages",
    "Forms",
    "Inventory Counts",
    "Settings",
    "one-tap mobile entry",
    "Manual Mobile Checklist",
    "npm run check:mobile-core-workflows",
  ],
  "mobile core workflows doc",
);

requireIncludes(
  service,
  [
    "mobileCoreWorkflows",
    "mobileCoreQuickActions",
    "inventory_counts",
    "/app/inventory/counts",
    "manager_review_schedule",
    "getMobileQuickActionsForAudience",
    "isMobileCoreWorkflowsReady",
  ],
  "mobile core workflows service",
);

requireIncludes(
  dashboardActions,
  [
    "Daily actions",
    "getMobileQuickActionsForAudience",
    "data-mobile-core-workflows",
    "start_inventory_count",
    "profile_notifications",
  ],
  "mobile dashboard workflow actions",
);

requireIncludes(
  dashboardPage,
  ["MobileCoreWorkflowActions", "{isMobile &&"],
  "dashboard page mobile workflow integration",
);

requireIncludes(
  plan,
  [
    "- [x] Verify dashboard, schedule, tasks, messages, forms, inventory counts, and settings.",
    "- [x] Fix touch targets and mobile forms.",
    "- [x] Simplify staff workflows.",
    "- [x] Add manager quick actions.",
    "08.05 Mobile Core Workflows",
    "mobile-core-workflows.md",
  ],
  "Plan 08 roadmap",
);

const phaseFiveBlock = plan.match(
  /### Phase 5: Mobile Core Workflows[\s\S]*?(?=### Phase 6: Push Notifications)/,
)?.[0];

if (!phaseFiveBlock || phaseFiveBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 5 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "mobile workflow contract",
    "Daily actions launcher",
    "dashboard, schedule, tasks, messages, forms, inventory counts, and settings",
    "CAPACITOR_SERVER_URL",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:mobile-core-workflows",
    "scripts/check-mobile-core-workflows-contract.mjs",
  ],
  "package scripts",
);

const productionSmokeRoutes = new Set(
  routeInventory.routes
    .filter((route) => route.status === "production" && route.smoke === true)
    .map((route) => route.path),
);

for (const path of [
  "/app/dashboard",
  "/app/enhanced-scheduling",
  "/app/tasks",
  "/app/messages",
  "/app/forms",
  "/app/inventory",
  "/app/settings",
]) {
  if (!productionSmokeRoutes.has(path)) {
    throw new Error(
      `Missing production smoke route for mobile workflow: ${path}`,
    );
  }
}

const routePaths = new Set(routeInventory.routes.map((route) => route.path));
if (!routePaths.has("/app/inventory/counts")) {
  throw new Error("Inventory counts route is missing from route inventory");
}

if (smokeReport.summary?.failed !== 0) {
  throw new Error("Latest visible-module smoke report is not green");
}

const smokeWarnings = Array.isArray(smokeReport.results)
  ? smokeReport.results.flatMap((result) => result.warnings ?? [])
  : [];
if (smokeWarnings.length > 0) {
  throw new Error("Latest visible-module smoke report still has warnings");
}

const workflow = await jiti.import(
  join(root, "src/services/mobile/mobileCoreWorkflows.ts"),
);

if (!workflow.isMobileCoreWorkflowsReady()) {
  throw new Error("Mobile core workflows contract is not ready");
}

process.stdout.write("OK mobile core workflows contract\n");
