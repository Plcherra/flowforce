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

const doc = readText("docs/execution-quality-analytics.md");
const roadmap = readText(
  "docs/roadmap/06-operations-workflows-and-compliance.md",
);
const masterRoadmap = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/06-09-execution-quality-analytics-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260528002000_phase6_execution_quality_analytics.sql",
);
const service = readText(
  "src/services/operations/executionQualityAnalytics.ts",
);
const panel = readText(
  "src/features/operations/components/ExecutionQualityPanel.tsx",
);
const hub = readText("src/features/operations/components/OperationsHub.tsx");
const dbTest = readText(
  "supabase/tests/phase6_execution_quality_analytics.test.sql",
);
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "operations_execution_quality_daily_v",
    "operations_execution_quality_summary_v",
    "operations_execution_quality_coaching_v",
    "repeat_failure_count",
    "execution_quality_score",
    "performance_training_context",
    "training_stats",
  ],
  "Execution quality migration",
);

requireIncludes(
  service,
  [
    "ExecutionQualitySummaryRow",
    "ExecutionQualityDailyRow",
    "ExecutionQualityCoachingRow",
    "summarizeExecutionQuality",
    "sortExecutionQualityTrends",
    "sortExecutionQualityCoaching",
  ],
  "Execution quality service",
);

requireIncludes(
  panel,
  [
    "ExecutionQualityPanel",
    "operations_execution_quality_summary_v",
    "operations_execution_quality_daily_v",
    "operations_execution_quality_coaching_v",
    "Execution Quality",
  ],
  "Execution quality panel",
);

requireIncludes(hub, ["ExecutionQualityPanel"], "Operations Hub");

requireIncludes(
  doc,
  [
    "Execution Quality Analytics",
    "operations_execution_quality_daily_v",
    "operations_execution_quality_summary_v",
    "operations_execution_quality_coaching_v",
    "repeat_failure",
    "training_followup",
  ],
  "Execution quality doc",
);

requireIncludes(
  roadmap,
  [
    "Track completion, overdue, exception, and repeat-failure metrics.",
    "Show trends by location, department, and role.",
    "Connect results to performance and training.",
    "Add manager coaching insights.",
    "06.09 Execution Quality Analytics",
    "docs/execution-quality-analytics.md",
  ],
  "Plan 06 roadmap",
);

const phaseNineBlock = roadmap.match(
  /### Phase 9: Analytics For Execution Quality[\s\S]*?### Phase 10:/,
)?.[0];

if (!phaseNineBlock || phaseNineBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 9 still has unchecked tasks");
}

requireIncludes(
  roadmap,
  [
    "06.09 Execution Quality Analytics",
    "./reports/06-09-execution-quality-analytics-2026-05-29.md",
  ],
  "Plan 06 roadmap report link",
);

requireIncludes(
  masterRoadmap,
  ["[x] 6.  Operations workflows and compliance"],
  "Master roadmap",
);

requireIncludes(
  dbTest,
  [
    "execution quality daily view tracks tenant workflow history",
    "summary counts the three workflow runs",
    "summary detects the repeat failure pattern",
    "coaching view recommends repeat-failure coaching",
    "Tenant B cannot see Tenant A execution quality analytics",
  ],
  "Execution quality DB test",
);

requireIncludes(
  report,
  [
    "operations_execution_quality_daily_v",
    "operations_execution_quality_summary_v",
    "operations_execution_quality_coaching_v",
    "ExecutionQualityPanel",
    "Phase 06.10",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:execution-quality",
    "scripts/check-execution-quality-analytics-contract.mjs",
    "supabase/tests/phase6_execution_quality_analytics.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK execution quality analytics contract\n");
