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

const doc = readText("docs/mobile-offline-queue-foundation.md");
const report = readText(
  "docs/roadmap/reports/08-07-offline-queue-foundation-2026-05-30.md",
);
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText("src/services/mobile/mobileOfflineQueue.ts");
const hook = readText("src/hooks/useMobileOfflineQueue.ts");
const component = readText("src/app-shell/mobile/MobileOfflineQueueStatus.tsx");
const appShell = readText("src/app-shell/AppShell.tsx");
const packageJson = readText("package.json");
const smokeReport = JSON.parse(
  readText("docs/test-results/visible-modules-smoke.json"),
);

requireIncludes(
  doc,
  [
    "Tasks: create, update, and complete.",
    "Forms: create draft, update answers, and submit.",
    "Inventory Counts: create count, update lines, and submit.",
    "pending`, `syncing`, `synced`, `failed`, or `conflict`",
    "flowforce.mobile.offlineQueue.v1",
    "enqueueMobileOfflineMutation",
    "npm run check:mobile-offline-queue",
  ],
  "mobile offline queue doc",
);

requireIncludes(
  service,
  [
    "MOBILE_OFFLINE_QUEUE_STORAGE_KEY",
    "mobileOfflineCapableEntities",
    "tasks",
    "forms",
    "inventory_counts",
    "enqueueMobileOfflineMutation",
    "markMobileOfflineMutationFailed",
    "markMobileOfflineMutationConflict",
    "retryFailedMobileOfflineMutations",
    "getMobileOfflineQueueSummary",
    "isMobileOfflineQueueReady",
  ],
  "mobile offline queue service",
);

requireIncludes(
  hook,
  [
    "useMobileOfflineQueue",
    "navigator.onLine",
    "online",
    "offline",
    "flowforce-mobile-offline-queue",
    "retryFailedMobileOfflineMutations",
    "pruneSyncedMobileOfflineMutations",
  ],
  "mobile offline queue hook",
);

requireIncludes(
  component,
  [
    "MobileOfflineQueueStatus",
    "data-mobile-offline-queue",
    "Offline mode",
    "pending",
    "failed",
    "conflict",
    "Retry",
    "Open queued workflow",
  ],
  "mobile offline queue status UI",
);

requireIncludes(
  appShell,
  ["MobileOfflineQueueStatus", "<MobileOfflineQueueStatus />"],
  "app shell offline queue integration",
);

requireIncludes(
  plan,
  [
    "- [x] Define offline-capable entities.",
    "- [x] Add mutation queue.",
    "- [x] Add retry, conflict, and failed-sync UI.",
    "- [x] Start with tasks/forms/counts.",
    "08.07 Offline Queue Foundation",
    "mobile-offline-queue-foundation.md",
  ],
  "Plan 08 roadmap",
);

const phaseSevenBlock = plan.match(
  /### Phase 7: Offline Queue Foundation[\s\S]*?(?=### Phase 8: Offline Inventory Counts And Forms)/,
)?.[0];

if (!phaseSevenBlock || phaseSevenBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 7 still has unchecked tasks");
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
    "shared mobile offline queue foundation",
    "tasks, forms, and inventory counts",
    "MobileOfflineQueueStatus",
    "npm run check:mobile-offline-queue",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:mobile-offline-queue",
    "scripts/check-mobile-offline-queue-contract.mjs",
  ],
  "package scripts",
);

if (smokeReport.summary?.failed !== 0) {
  throw new Error("Latest visible-module smoke report is not green");
}

const smokeWarnings = Array.isArray(smokeReport.results)
  ? smokeReport.results.flatMap((result) => result.warnings ?? [])
  : [];
if (smokeWarnings.length > 0) {
  throw new Error("Latest visible-module smoke report still has warnings");
}

const offlineQueue = await jiti.import(
  join(root, "src/services/mobile/mobileOfflineQueue.ts"),
);

if (!offlineQueue.isMobileOfflineQueueReady()) {
  throw new Error("Mobile offline queue contract is not ready");
}

const summary = offlineQueue.getMobileOfflineQueueSummary([
  {
    id: "one",
    companyId: "company",
    userId: "user",
    entity: "tasks",
    operation: "update",
    route: "/app/tasks",
    payload: {},
    optimisticKey: "task-1",
    clientVersion: new Date().toISOString(),
    status: "conflict",
    retryCount: 0,
    maxRetries: 5,
    nextAttemptAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);

if (summary.conflict !== 1 || summary.nextRoute !== "/app/tasks") {
  throw new Error("Offline queue summary should expose conflict and route");
}

process.stdout.write("OK mobile offline queue contract\n");
