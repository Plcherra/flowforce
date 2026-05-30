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

const doc = readText("docs/mobile-responsive-qa-baseline.md");
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/08-02-responsive-web-qa-baseline-2026-05-29.md",
);
const service = readText("src/services/mobile/mobileResponsiveBaseline.ts");
const smoke = readText("scripts/smoke-visible-modules.mjs");
const layout = readText("app/layout.tsx");
const globals = readText("app/globals.css");
const appShell = readText("src/app-shell/AppShell.tsx");
const packageJson = readText("package.json");
const smokeReport = JSON.parse(
  readText("docs/test-results/visible-modules-smoke.json"),
);

requireIncludes(
  doc,
  [
    "390 x 844",
    "Horizontal document overflow fails the route.",
    "Mobile touch-target warnings",
    "viewport-fit=cover",
    "100dvh",
    "env(safe-area-inset-*)",
    "prefer `localhost` in `TEST_URL`",
    "zero mobile touch-target warnings",
    "Current Debt",
    "npm run test:smoke",
  ],
  "mobile responsive baseline doc",
);

requireIncludes(
  smoke,
  [
    "mobile: { width: 390, height: 844, isMobile: true }",
    "SMOKE_VIEWPORTS",
    "detectHorizontalOverflow",
    "Horizontal overflow",
    "detectTouchTargetWarnings",
    "visible touch targets below 36px minimum",
    "http://localhost:3000",
    "moduleRouteInventory.json",
  ],
  "visible module smoke runner",
);

requireIncludes(
  layout,
  [
    'viewportFit: "cover"',
    'width: "device-width"',
    "initialScale: 1",
    "themeColor",
  ],
  "root layout viewport metadata",
);

requireIncludes(
  globals,
  [
    "overflow-x: hidden;",
    "100dvh",
    "env(safe-area-inset-top)",
    "env(safe-area-inset-bottom)",
    ".app-viewport",
  ],
  "global mobile viewport styles",
);

requireIncludes(
  appShell,
  ["app-viewport", "overflow-hidden bg-background"],
  "app shell mobile viewport",
);

requireIncludes(
  service,
  [
    "responsiveBaselineViewports",
    "responsiveBaselineRoutes",
    "responsiveBaselineChecks",
    "horizontal_overflow_failure",
    "mobile_touch_target_warnings",
    "safe_area_viewport_container",
    "mobileResponsiveDebt",
  ],
  "mobile responsive baseline service",
);

requireIncludes(
  plan,
  [
    "- [x] Audit core modules on mobile viewport.",
    "- [x] Fix navigation, safe areas, sticky elements, modals, tables, forms, and text overflow.",
    "- [x] Add screenshots or smoke checks.",
    "- [x] Document remaining mobile UX debt.",
    "08.02 Responsive Web QA Baseline",
    "mobile-responsive-qa-baseline.md",
  ],
  "Plan 08 roadmap",
);

const phaseTwoBlock = plan.match(
  /### Phase 2: Responsive Web QA Baseline[\s\S]*?(?=### Phase 3: Capacitor Shell)/,
)?.[0];

if (!phaseTwoBlock || phaseTwoBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 2 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Current phase: Phase 10, Production Infrastructure And Launch",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
    "[x] Mobile app path is shippable on iOS and Android.",
    "[x] 8.  Mobile app and offline mode",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "formal responsive web QA baseline",
    "mobile touch-target warnings",
    "no route failures, horizontal overflow errors, or mobile touch-target warnings",
    "viewport-fit=cover",
    "100dvh",
    "safe-area inset handling",
    "npm run check:mobile-responsive-baseline",
    "Phase 08.03",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:mobile-responsive-baseline",
    "scripts/check-mobile-responsive-baseline-contract.mjs",
  ],
  "package scripts",
);

const baseline = await jiti.import(
  join(root, "src/services/mobile/mobileResponsiveBaseline.ts"),
);

if (!baseline.isMobileResponsiveBaselineReady()) {
  throw new Error("Mobile responsive baseline contract is not ready");
}

if (smokeReport.summary?.total !== 22 || smokeReport.summary?.failed !== 0) {
  throw new Error("Visible module smoke report is not green for all 22 routes");
}

const smokeResults = Array.isArray(smokeReport.results)
  ? smokeReport.results
  : [];
const smokeViewports = new Set(smokeResults.map((result) => result.viewport));
if (!smokeViewports.has("desktop") || !smokeViewports.has("mobile")) {
  throw new Error(
    "Visible module smoke report must include desktop and mobile viewports",
  );
}

const failedSmokeEntries = smokeResults.filter(
  (result) =>
    (Array.isArray(result.errors) && result.errors.length > 0) ||
    (Array.isArray(result.warnings) && result.warnings.length > 0),
);

if (failedSmokeEntries.length > 0) {
  const labels = failedSmokeEntries
    .map((result) => `${result.viewport}:${result.path}`)
    .join(", ");
  throw new Error(
    `Visible module smoke report has errors or warnings: ${labels}`,
  );
}

process.stdout.write("OK mobile responsive baseline contract\n");
