import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

const fail = (message) => errors.push(message);

const mustExist = (relativePath) => {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`Missing required file: ${relativePath}`);
  }
};

const mustNotExist = (relativePath) => {
  if (fs.existsSync(path.join(root, relativePath))) {
    fail(`Legacy file should be deleted: ${relativePath}`);
  }
};

const readText = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

// Required scheduling surface
[
  "src/features/scheduling/components/NextGenSchedulingSystem.tsx",
  "src/features/scheduling/components/SchedulingPanelSheet.tsx",
  "src/features/scheduling/hooks/useSchedulingRole.ts",
  "src/features/scheduling/hooks/useSchedulingPanels.ts",
  "src/features/scheduling/types/panels.ts",
  "docs/scheduling-workflow.md",
].forEach(mustExist);

// Deleted legacy artifacts
[
  "src/features/scheduling/components/WeeklySchedulingDashboard.tsx",
  "src/features/scheduling/components/SchedulingCopilotPanel.tsx",
  "src/features/scheduling/components/ComplianceMonitor.tsx",
  "src/features/scheduling/pages/ScheduleLobby.tsx",
  "src/features/scheduling/pages/TimeOff.tsx",
  "src/features/scheduling/hooks/useSchedulingTabs.ts",
  "src/features/scheduling/types/tabs.ts",
  "src/features/scheduling/services/guardrail/scheduleWorkflowService.ts",
].forEach(mustNotExist);

const panelsSource = readText("src/features/scheduling/types/panels.ts");
for (const panelId of ["timeoff", "swaps", "availability", "staff", "workflow"]) {
  if (!panelsSource.includes(`"${panelId}"`)) {
    fail(`Scheduling panel id missing from panels.ts: ${panelId}`);
  }
}

const nextConfig = readText("next.config.mjs");
if (!nextConfig.includes("/app/enhanced-scheduling?panel=timeoff")) {
  fail("next.config.mjs should redirect /time-off to enhanced-scheduling timeoff panel");
}
if (!nextConfig.includes("'/schedule-lobby', destination: '/app/enhanced-scheduling'")) {
  fail("next.config.mjs should redirect /schedule-lobby to enhanced-scheduling");
}

const schedulingIndex = readText("src/features/scheduling/index.ts");
if (schedulingIndex.includes("ScheduleLobbyPage") || schedulingIndex.includes("TimeOffPage")) {
  fail("scheduling/index.ts should not export removed page components");
}
if (schedulingIndex.includes("types/tabs")) {
  fail("scheduling/index.ts should export types/panels instead of deprecated types/tabs");
}

mustExist("supabase/tests/schedule_availability_validation.test.sql");

const packageJson = readText("package.json");
if (
  !packageJson.includes("schedule_availability_validation.test.sql") ||
  !packageJson.includes("test:scheduling-availability")
) {
  fail(
    "package.json test:scheduling-availability should run supabase/tests/schedule_availability_validation.test.sql",
  );
}

if (errors.length > 0) {
  console.error("Scheduling workflow contract check failed:\n");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("Scheduling workflow contract check passed.");
