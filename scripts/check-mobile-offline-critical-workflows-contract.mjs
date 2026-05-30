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

const doc = readText("docs/mobile-offline-critical-workflows.md");
const report = readText(
  "docs/roadmap/reports/08-08-offline-inventory-counts-and-forms-2026-05-30.md",
);
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText(
  "src/services/mobile/mobileOfflineCriticalWorkflows.ts",
);
const inventoryHook = readText(
  "src/features/inventory/hooks/useInventoryCounts.tsx",
);
const formsHook = readText("src/features/forms/hooks/useForms.tsx");
const packageJson = readText("package.json");

requireIncludes(
  doc,
  [
    "Inventory counts can be created while offline.",
    "Inventory count progress can be updated while offline.",
    "Form and checklist submissions can be saved while offline.",
    "sanitizeOfflineEvidencePayload",
    "metadata-only local-storage policy",
    "pending_review_sync",
    "npm run check:mobile-offline-critical-workflows",
  ],
  "mobile offline critical workflows doc",
);

requireIncludes(
  service,
  [
    "mobileOfflineCriticalWorkflowChecks",
    "isOfflineQueueableError",
    "sanitizeOfflineEvidencePayload",
    "queueOfflineInventoryCountCreate",
    "queueOfflineInventoryCountUpdate",
    "queueOfflineInventoryCountLineUpdate",
    "queueOfflineInventoryCountSubmit",
    "queueOfflineFormSubmission",
    "metadata_only_until_sync",
    "isMobileOfflineCriticalWorkflowsReady",
  ],
  "mobile offline critical workflows service",
);

requireIncludes(
  inventoryHook,
  [
    "isOfflineQueueableError",
    "queueOfflineInventoryCountCreate",
    "queueOfflineInventoryCountUpdate",
    "queueOfflineInventoryCountLineUpdate",
    "queueOfflineInventoryCountSubmit",
    "pending_offline_sync",
    "pending_review_sync",
    "Saved offline",
  ],
  "inventory offline hook integration",
);

requireIncludes(
  formsHook,
  [
    "queueOfflineFormSubmission",
    "isOfflineQueueableError",
    "offline_queue_id",
    "pending_review_sync",
    "Saved offline",
  ],
  "forms offline hook integration",
);

requireIncludes(
  plan,
  [
    "- [x] Make counts usable offline.",
    "- [x] Make checklist/form runs usable offline.",
    "- [x] Store evidence safely.",
    "- [x] Sync with review status.",
    "08.08 Offline Inventory Counts And Forms",
    "mobile-offline-critical-workflows.md",
  ],
  "Plan 08 roadmap",
);

const phaseEightBlock = plan.match(
  /### Phase 8: Offline Inventory Counts And Forms[\s\S]*?(?=### Phase 9: App Store Readiness)/,
)?.[0];

if (!phaseEightBlock || phaseEightBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 8 still has unchecked tasks");
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
    "inventory counts and forms/checklists",
    "mobileOfflineCriticalWorkflows.ts",
    "Evidence-like `File` and `Blob` payload values are sanitized",
    "npm run check:mobile-offline-critical-workflows",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:mobile-offline-critical-workflows",
    "scripts/check-mobile-offline-critical-workflows-contract.mjs",
  ],
  "package scripts",
);

const offlineCritical = await jiti.import(
  join(root, "src/services/mobile/mobileOfflineCriticalWorkflows.ts"),
);

if (!offlineCritical.isMobileOfflineCriticalWorkflowsReady()) {
  throw new Error("Mobile offline critical workflows contract is not ready");
}

const { sanitized, evidenceSummary } =
  offlineCritical.sanitizeOfflineEvidencePayload({
    label: "temperature check",
    attachment: new Blob(["proof"], { type: "text/plain" }),
  });

if (!evidenceSummary.hasEvidence || evidenceSummary.fileCount !== 1) {
  throw new Error(
    "Offline evidence summary should detect one evidence payload",
  );
}

if (sanitized.attachment?.offlineEvidence !== true) {
  throw new Error("Offline evidence payload should be replaced with metadata");
}

process.stdout.write("OK mobile offline critical workflows contract\n");
