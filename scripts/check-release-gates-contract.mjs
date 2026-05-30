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

const releaseWorkflow = readText(".github/workflows/release-gates.yml");
const deployWorkflow = readText(".github/workflows/deploy-readiness.yml");
const packageJson = readText("package.json");
const service = readText("src/services/infrastructure/productionReleaseGates.ts");
const doc = readText("docs/production-ci-cd-release-gates.md");
const architectureDoc = readText("docs/build-and-test-architecture.md");
const androidDebugBuildScript = readText("scripts/run-android-debug-build.mjs");
const plan = readText("docs/roadmap/10-production-infrastructure-and-launch.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-08-ci-cd-release-gates-2026-05-30.md",
);

requireIncludes(
  releaseWorkflow,
  [
    "Release Gates",
    "pull_request:",
    "branches:",
    "- main",
    "supabase db reset",
    "npm run check:supabase",
    "npm run test:db:security",
    "npm run typecheck:src",
    "npm run typecheck",
    "npm run build",
    "Docker image build gate",
    "docker build",
    "flowforce-web:ci",
    "Mobile Android build gate",
    "actions/setup-java@v4",
    "npm run mobile:android:sync",
    "npm run mobile:android:debug",
    "npm run test:e2e:onboarding",
    "npm run test:smoke",
  ],
  "release gates workflow",
);

requireIncludes(
  deployWorkflow,
  [
    "Deploy Readiness",
    "Require deploy secrets",
    "SUPABASE_DB_PASSWORD",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "npm run check:supabase:remote-drift",
    "npm run check:supabase",
  ],
  "deploy readiness workflow",
);

requireIncludes(
  packageJson,
  [
    "check:release-gates",
    "scripts/check-release-gates-contract.mjs",
    "mobile:android:sync",
    "cap sync android",
    "mobile:android:debug",
    "scripts/run-android-debug-build.mjs",
  ],
  "package scripts",
);

requireIncludes(
  androidDebugBuildScript,
  [
    "assembleDebug",
    "--no-daemon",
    "--console=plain",
    "filteredLinePatterns",
  ],
  "Android debug build wrapper",
);

requireIncludes(
  service,
  [
    "productionReleaseGates",
    "supabase_drift_security",
    "database_isolation",
    "next_build",
    "docker_build",
    "mobile_android_build",
    "runtime_smoke",
    "buildProductionReleaseGateReadiness",
    "isProductionReleaseGatesReady",
  ],
  "production release gates service",
);

requireIncludes(
  doc,
  [
    "Production CI/CD Release Gates",
    "not using Vercel",
    "Release Gates workflow now enforces",
    "docker build --tag flowforce-web:ci .",
    "npm run mobile:android:sync",
    "npm run mobile:android:debug",
    "Deploy Readiness",
    "Timestamp: 2026-05-30",
  ],
  "production release gates doc",
);

requireIncludes(
  architectureDoc,
  [
    "Docker image build gate",
    "Mobile Android build gate",
    "iOS compile/signing remains outside the Linux Release Gates runner",
  ],
  "build and test architecture doc",
);

requireIncludes(
  plan,
  [
    "- [x] Keep Supabase drift and security gates.",
    "- [x] Keep build/typecheck/smoke gates.",
    "- [x] Add Docker build gate.",
    "- [x] Add mobile build gate when mobile is active.",
    "10.08 CI/CD Release Gates",
    "production-ci-cd-release-gates.md",
  ],
  "Plan 10 roadmap",
);

const phaseEightBlock = plan.match(
  /### Phase 8: CI\/CD Release Gates[\s\S]*?(?=### Phase 9: Pilot Launch Checklist)/,
)?.[0];

if (!phaseEightBlock || phaseEightBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 8 still has unchecked tasks");
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
    "production release-gate policy contract",
    "Docker image build gate",
    "Android Capacitor build scripts",
    "Phase 10.09",
  ],
  "Plan 10 phase report",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/productionReleaseGates.ts"),
);

if (!runtime.isProductionReleaseGatesReady()) {
  throw new Error("Production release gates readiness check failed");
}

const readiness = runtime.buildProductionReleaseGateReadiness();

if (
  !readiness.keepsSupabaseGates ||
  !readiness.keepsDatabaseSecurityTests ||
  !readiness.keepsBuildTypecheckSmoke ||
  !readiness.hasDockerBuildGate ||
  !readiness.hasMobileBuildGate ||
  !readiness.hasMainBranchProtectionShape
) {
  throw new Error("Production release gate readiness flags are incomplete");
}

console.log("OK production release gates contract");
