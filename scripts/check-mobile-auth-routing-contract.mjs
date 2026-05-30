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

const doc = readText("docs/mobile-auth-routing-app-shell.md");
const report = readText(
  "docs/roadmap/reports/08-04-auth-and-routing-app-shell-2026-05-29.md",
);
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText("src/services/mobile/mobileAuthRouting.ts");
const authHook = readText("src/hooks/useAuth.tsx");
const authPage = readText("src/features/auth/pages/Auth.tsx");
const navigationGuard = readText(
  "src/app-shell/navigation/NavigationGuard.tsx",
);
const packageJson = readText("package.json");

requireIncludes(
  doc,
  [
    "Login preserves a same-origin `redirectTo` target",
    "Session restore runs on initial hydration.",
    "Session refresh runs on focus",
    "Native Shell Boundary",
    "CAPACITOR_SERVER_URL",
    "Android Gradle verification now passes",
    "supabase migration list",
    "npm run check:mobile-auth-routing",
  ],
  "mobile auth routing doc",
);

requireIncludes(
  service,
  [
    "mobileAuthRedirectParam",
    "mobileAuthRequiredFlows",
    "mobileAuthErrorStates",
    "isSafeMobileAuthRedirect",
    "getSafeMobileAuthRedirect",
    "buildMobileAuthRedirectPath",
    "getMobileSignUpRedirectUrl",
    "getMobilePasswordResetRedirectUrl",
    "registerMobileAppResumeHandler",
    "isMobileAuthRoutingReady",
  ],
  "mobile auth routing service",
);

requireIncludes(
  authHook,
  [
    "exchangeCodeForSession",
    "registerMobileAppResumeHandler",
    "getMobileSignUpRedirectUrl",
    "getMobilePasswordResetRedirectUrl",
    "app_resume",
    "mobile-app-shell",
  ],
  "auth hook mobile shell handling",
);

requireIncludes(
  navigationGuard,
  [
    "buildMobileAuthRedirectPath",
    "currentTarget",
    "redirectTo(buildMobileAuthRedirectPath",
  ],
  "navigation guard mobile redirect handling",
);

requireIncludes(
  authPage,
  ["mobileAuthRedirectParam", "getSafeMobileAuthRedirect", "authSuccessPath"],
  "auth page redirect handling",
);

requireIncludes(
  plan,
  [
    "- [x] Verify login, signup, onboarding, session restore, and logout.",
    "- [x] Fix deep links and redirect URLs.",
    "- [x] Handle app resume/refresh.",
    "- [x] Add app-shell-specific error states.",
    "08.04 Auth And Routing In App Shell",
    "mobile-auth-routing-app-shell.md",
  ],
  "Plan 08 roadmap",
);

const phaseFourBlock = plan.match(
  /### Phase 4: Auth And Routing In App Shell[\s\S]*?(?=### Phase 5: Mobile Core Workflows)/,
)?.[0];

if (!phaseFourBlock || phaseFourBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 4 still has unchecked tasks");
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
    "app-shell auth and routing contract",
    "preserves protected-route deep links through login",
    "rejects unsafe redirect targets",
    "refreshes session state on app resume",
    "reachable `CAPACITOR_SERVER_URL`",
    "Post-08.03 shell revalidation",
    "20260529001000_phase7_ai_security_hardening.sql",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:mobile-auth-routing",
    "scripts/check-mobile-auth-routing-contract.mjs",
  ],
  "package scripts",
);

const authRouting = await jiti.import(
  join(root, "src/services/mobile/mobileAuthRouting.ts"),
);

if (!authRouting.isMobileAuthRoutingReady()) {
  throw new Error("Mobile auth routing contract is not ready");
}

if (!authRouting.isSafeMobileAuthRedirect("/app/tasks?tab=today")) {
  throw new Error("Expected app route redirect to be safe");
}

if (authRouting.isSafeMobileAuthRedirect("https://example.com/app/tasks")) {
  throw new Error("External redirect must be rejected");
}

process.stdout.write("OK mobile auth routing contract\n");
