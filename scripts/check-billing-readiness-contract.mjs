import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const fail = (message) => {
  throw new Error(`[billing-readiness-contract] ${message}`);
};

const assertIncludes = (text, pattern, message) => {
  if (!text.includes(pattern)) fail(message);
};

const billingPlans = readText("src/services/billing/billingPlans.ts");
const featureFlags = readText("src/hooks/useFeatureFlags.tsx");
const systemTypes = readText("src/types/system-settings.ts");
const defaults = readText(
  "src/features/system/hooks/systemSettingsDefaults.ts",
);
const adminNormalizer = readText(
  "src/features/system/hooks/normalizers/admin.ts",
);
const adminPanel = readText(
  "src/features/system/components/AdminSettingsPanel.tsx",
);

for (const plan of ["starter", "growth", "enterprise"]) {
  assertIncludes(billingPlans, `"${plan}"`, `billing plan ${plan} is required`);
}

for (const status of [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "disabled",
]) {
  assertIncludes(
    billingPlans,
    `"${status}"`,
    `account status ${status} is required`,
  );
}

for (const helper of [
  "normalizeBillingPlan",
  "normalizeBillingStatus",
  "resolveBillingAccountStatus",
  "applyBillingToFeatureFlags",
]) {
  assertIncludes(
    billingPlans,
    helper,
    `billing helper ${helper} must be defined`,
  );
}

for (const field of [
  "accountStatus",
  "subscriptionStatus",
  "billingEmail",
  "currentPeriodEndsAt",
  "trialEndsAt",
]) {
  assertIncludes(
    systemTypes,
    field,
    `tenant management type must include ${field}`,
  );
  assertIncludes(
    defaults,
    field,
    `tenant management defaults must include ${field}`,
  );
  assertIncludes(
    adminNormalizer,
    field,
    `tenant management normalizer must include ${field}`,
  );
  assertIncludes(adminPanel, field, `admin settings UI must expose ${field}`);
}

assertIncludes(
  featureFlags,
  "system_settings",
  "feature flags must read tenant billing settings",
);
assertIncludes(
  featureFlags,
  "applyBillingToFeatureFlags",
  "feature flags must apply plan and account status gates",
);
assertIncludes(
  featureFlags,
  "billing-feature-flags",
  "billing feature checks must have a stable query key",
);
assertIncludes(
  adminPanel,
  "BILLING_PLANS",
  "admin settings UI must use canonical billing plans",
);
assertIncludes(
  adminPanel,
  "BILLING_ACCOUNT_STATUSES",
  "admin settings UI must use canonical account statuses",
);

console.log("OK billing readiness contract: plans, statuses, gates, UI");
