import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const fail = (message) => {
  throw new Error(`[support-admin-tooling-contract] ${message}`);
};

const assertIncludes = (text, pattern, message) => {
  if (!text.includes(pattern)) fail(message);
};

const route = readText("app/api/internal/support/tenant/route.ts");
const migration = readText(
  "supabase/migrations/20260527000400_phase3_support_admin_tooling.sql",
);
const policy = readText("src/services/support/supportToolingPolicy.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const docs = readText("docs/support-admin-tooling.md");
const envExample = readText(".env.example");
const environmentDocs = readText("docs/environment-configuration.md");
const roadmap = readText("docs/roadmap/03-core-saas-foundation.md");

for (const token of [
  "SUPPORT_ADMIN_TOKEN",
  "x-support-token",
  "timingSafeEqual",
]) {
  assertIncludes(route, token, `support route must enforce ${token}`);
}
assertIncludes(
  envExample,
  "SUPPORT_ADMIN_TOKEN",
  ".env.example must document SUPPORT_ADMIN_TOKEN",
);
assertIncludes(
  environmentDocs,
  "SUPPORT_ADMIN_TOKEN",
  "environment docs must document SUPPORT_ADMIN_TOKEN",
);

for (const item of [
  "support_tool_runs",
  "tenant_diagnostics",
  "repair_onboarding_baseline",
  "started",
  "succeeded",
  "failed",
  "blocked",
]) {
  assertIncludes(migration, item, `migration must include ${item}`);
  assertIncludes(route, item, `route must include ${item}`);
}

for (const auditAction of [
  "support.tenant_diagnostics_viewed",
  "support.tenant_repair_executed",
]) {
  assertIncludes(
    auditEvents,
    auditAction,
    `audit event ${auditAction} required`,
  );
}

for (const auditConstant of [
  "AUDIT_ACTIONS.supportTenantDiagnosticsViewed",
  "AUDIT_ACTIONS.supportTenantRepairExecuted",
]) {
  assertIncludes(route, auditConstant, `route must write ${auditConstant}`);
}

for (const safetyTerm of [
  "SUPPORT_IMPERSONATION_DECISION",
  "does not allow support staff to impersonate",
  "blocked",
]) {
  assertIncludes(policy, safetyTerm, `policy must include ${safetyTerm}`);
}

for (const baseline of [
  "verifyOnboardingSetup",
  "company_members",
  "system_settings",
  "company_roles",
  "company.setup_verified",
  "dryRun",
  "auditServiceRoleOperation",
]) {
  assertIncludes(route, baseline, `support route must cover ${baseline}`);
}

assertIncludes(
  docs,
  "Support impersonation is blocked",
  "docs must record the impersonation decision",
);
assertIncludes(
  docs,
  "Dry-run is the default",
  "docs must require safe repair previews",
);
assertIncludes(
  roadmap,
  "03.08 Support And Admin Tooling",
  "phase 03.08 report must be linked",
);
console.log(
  "OK support admin tooling contract: protected, audited, repairable",
);
