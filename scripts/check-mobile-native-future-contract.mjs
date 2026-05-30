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

const doc = readText("docs/mobile-native-future-evaluation.md");
const report = readText(
  "docs/roadmap/reports/08-10-native-future-evaluation-2026-05-30.md",
);
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText("src/services/mobile/mobileNativeFutureEvaluation.ts");
const packageJson = readText("package.json");

requireIncludes(
  doc,
  [
    "Capacitor remains the v1 app-store path.",
    "should not start a broad Expo, React Native, Flutter, or native rewrite now",
    "Offline queue foundation",
    "Offline protection for forms and inventory counts",
    "Native Triggers",
    "Inventory count execution",
    "Forms, checklists, and evidence capture",
    "Task and workflow field execution",
    "Shared Contracts Before Native Work",
    "npm run check:mobile-native-future",
  ],
  "mobile native future evaluation doc",
);

requireIncludes(
  service,
  [
    "mobileNativeFutureDecision",
    "capacitor_is_v1_path",
    "deferred_until_pilot_evidence",
    "nativeFutureTriggers",
    "offline_data_loss",
    "platform_policy_blocker",
    "nativeCandidateScreens",
    "inventory_counts",
    "forms_and_evidence",
    "tasks_and_workflows",
    "mobileNativeSharedContracts",
    "offline queue payloads",
    "shouldStartNativeRewrite",
    "isMobileNativeFutureEvaluationReady",
  ],
  "mobile native future service",
);

requireIncludes(
  plan,
  [
    "- [x] Decide whether Capacitor is enough.",
    "- [x] If needed, plan Expo/native screens for field-heavy workflows.",
    "- [x] Define shared contracts for native app.",
    "- [x] Update roadmap status.",
    "08.10 Native Future Evaluation",
    "mobile-native-future-evaluation.md",
  ],
  "Plan 08 roadmap",
);

const phaseTenBlock = plan.match(
  /### Phase 10: Native Future Evaluation[\s\S]*$/,
)?.[0];

if (!phaseTenBlock || phaseTenBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 10 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
    "- [x] Mobile app path is shippable on iOS and Android.",
    "- [x] 8.  Mobile app and offline mode",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "Capacitor remains the v1 app-store path",
    "native rewrite is deferred until pilot evidence justifies it",
    "inventory counts, forms/evidence, and task/workflow execution",
    "Plan 8 is now complete",
    "09 Integrations And Migration Tools",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:mobile-native-future",
    "scripts/check-mobile-native-future-contract.mjs",
  ],
  "package scripts",
);

const nativeFuture = await jiti.import(
  join(root, "src/services/mobile/mobileNativeFutureEvaluation.ts"),
);

if (!nativeFuture.isMobileNativeFutureEvaluationReady()) {
  throw new Error("Mobile native future evaluation contract is not ready");
}

if (!nativeFuture.shouldStartNativeRewrite(["offline_data_loss"])) {
  throw new Error(
    "Offline data loss should trigger native rewrite consideration",
  );
}

if (nativeFuture.shouldStartNativeRewrite(["field_performance_pressure"])) {
  throw new Error(
    "Field performance monitoring alone should not force rewrite",
  );
}

process.stdout.write("OK mobile native future contract\n");
