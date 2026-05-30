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

const decision = readText("docs/mobile-strategy-decision.md");
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText("docs/roadmap/reports/08-01-mobile-strategy-decision-2026-05-29.md");
const service = readText("src/services/mobile/mobileStrategy.ts");
const packageJson = readText("package.json");
const architecture = readText("docs/platform-architecture-baseline.md");

requireIncludes(
  decision,
  [
    "Capacitor-first",
    "Next.js PWA/mobile web",
    "Expo/native later",
    "not a Flutter rewrite",
    "Auth, signup handoff, onboarding status, session restore, logout, and tenant switching.",
    "Apple Developer and Google Play Console accounts",
    "Web-Only For V1",
    "Native Triggers",
  ],
  "mobile strategy decision",
);

requireIncludes(
  architecture,
  [
    "FlowForce remains a single Next.js application for web and mobile web/PWA.",
    "Native wrapper later: Capacitor-first after pilot workflows are stable on mobile web.",
    "Flutter rewrite.",
  ],
  "platform architecture baseline",
);

requireIncludes(
  service,
  [
    "capacitor_first",
    "expo_native_later",
    "nextjs_pwa_mobile_web",
    "flutterV1: false",
    "expoFirstV1: false",
    "separateMobileProduct: false",
    "v1MustDoWorkflows",
    "appStoreRequirements",
    "webOnlyForV1",
    "nativeEscalationTriggers",
  ],
  "mobile strategy service",
);

requireIncludes(
  plan,
  [
    "- [x] Choose Capacitor-first or Expo-first for v1 mobile.",
    "- [x] Define what \"mobile app\" must do for pilot customers.",
    "- [x] Define app store requirements.",
    "- [x] Define what remains web-only.",
    "08.01 Mobile Strategy Decision",
    "mobile-strategy-decision.md",
  ],
  "Plan 08 roadmap",
);

const phaseOneBlock = plan.match(
  /### Phase 1: Mobile Strategy Decision[\s\S]*?(?=### Phase 2: Responsive Web QA Baseline)/,
)?.[0];

if (!phaseOneBlock || phaseOneBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 1 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [09 Integrations And Migration Tools]",
    "Current phase: Phase 9, Integrations And Migration Tools",
    "Last completed phase: 09.04, Checklist Platform Migration Path",
    "Last phase report: [09.04 Checklist Platform Migration Path]",
    "[x] Mobile app path is shippable on iOS and Android.",
    "[x] 8.  Mobile app and offline mode",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "Capacitor-first mobile strategy",
    "Next.js PWA/mobile web app remains the source product",
    "Expo/native remains a later option",
    "Flutter is not part of the v1 path",
    "npm run check:mobile-strategy",
    "Phase 08.02",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:mobile-strategy",
    "scripts/check-mobile-strategy-contract.mjs",
  ],
  "package scripts",
);

const mobileStrategy = await jiti.import(join(root, "src/services/mobile/mobileStrategy.ts"));

if (!mobileStrategy.isMobileStrategyReady()) {
  throw new Error("Mobile strategy contract is not ready");
}

if (mobileStrategy.mobileStrategyDecision.selectedPath !== "capacitor_first") {
  throw new Error("Mobile strategy does not select Capacitor-first");
}

if (mobileStrategy.mobileStrategyDecision.rewritePolicy.flutterV1 !== false) {
  throw new Error("Mobile strategy unexpectedly allows a Flutter v1 rewrite");
}

process.stdout.write("OK mobile strategy contract\n");
