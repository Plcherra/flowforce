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

const baselineScript = readText("scripts/run-performance-load-baseline.mjs");
const service = readText(
  "src/services/infrastructure/productionPerformanceLoadBaseline.ts",
);
const doc = readText("docs/production-performance-load-baseline.md");
const plan = readText("docs/roadmap/10-production-infrastructure-and-launch.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-07-performance-load-baseline-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  baselineScript,
  [
    "PERF_BASE_URL",
    "PERF_LOAD_REQUESTS",
    "PERF_LOAD_CONCURRENCY",
    "PERF_OUTPUT_FILE",
    "sizeSummary",
    "runLoadProbe",
    "pageProbes",
    "hotQueryFamilies",
    "performance-load-baseline.json",
  ],
  "performance baseline script",
);

requireIncludes(
  service,
  [
    "productionPerformanceLoadBaseline",
    "build_size",
    "page_load",
    "api_latency",
    "database_hot_queries",
    "pilot_load",
    "run-performance-load-baseline.mjs",
    "buildProductionPerformanceReadiness",
    "isProductionPerformanceLoadBaselineReady",
  ],
  "performance baseline service",
);

requireIncludes(
  doc,
  [
    "Production Performance And Load Baseline",
    "Pilot Load Target",
    "Current Build Baseline",
    ".next/static",
    ".next/server",
    "PERF_BASE_URL",
    "Database Hot Query Families",
    "Timestamp: 2026-05-30",
  ],
  "performance baseline doc",
);

requireIncludes(
  plan,
  [
    "- [x] Measure build size, page load, API latency, and database hot queries.",
    "- [x] Add indexes/RPC improvements where needed.",
    "- [x] Define acceptable pilot load.",
    "- [x] Add basic load test script.",
    "10.07 Performance And Load Baseline",
    "production-performance-load-baseline.md",
  ],
  "Plan 10 roadmap",
);

const phaseSevenBlock = plan.match(
  /### Phase 7: Performance And Load Baseline[\s\S]*?(?=### Phase 8: CI\/CD Release Gates)/,
)?.[0];

if (!phaseSevenBlock || phaseSevenBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 7 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Current phase: Phase 10, Production Infrastructure And Launch",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "performance/load policy contract",
    "run-performance-load-baseline.mjs",
    "50 concurrent active users",
    ".next/static",
    "Phase 10.08",
  ],
  "Plan 10 phase report",
);

requireIncludes(
  packageJson,
  [
    "perf:baseline",
    "check:performance-load-baseline",
    "scripts/check-performance-load-baseline-contract.mjs",
  ],
  "package scripts",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/productionPerformanceLoadBaseline.ts"),
);

if (!runtime.isProductionPerformanceLoadBaselineReady()) {
  throw new Error("Production performance load baseline readiness check failed");
}

const readiness = runtime.buildProductionPerformanceReadiness();

if (
  !readiness.hasBuildSizeBudget ||
  !readiness.hasPageLoadBudget ||
  !readiness.hasApiLatencyBudget ||
  !readiness.hasDatabaseHotQueryReview ||
  !readiness.hasPilotLoadDefinition ||
  !readiness.hasLoadTestScript ||
  !readiness.hasStoredReport
) {
  throw new Error("Production performance readiness flags are incomplete");
}

console.log("OK production performance load baseline contract");
