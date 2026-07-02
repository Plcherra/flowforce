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
const billingPanel = readText(
  "src/features/system/components/BillingSettingsPanel.tsx",
);

for (const plan of ["starter", "growth", "enterprise"]) {
  assertIncludes(billingPlans, `"${plan}"`, `billing plan ${plan} is required`);
}

for (const status of ["trial", "active", "deactivated"]) {
  assertIncludes(
    billingPlans,
    `"${status}"`,
    `billing status ${status} is required`,
  );
}

for (const helper of [
  "normalizeBillingPlan",
  "normalizeBillingStatus",
  "resolveBillingStatus",
  "applyBillingToFeatureFlags",
  "mapLegacyBillingStatus",
]) {
  assertIncludes(
    billingPlans,
    helper,
    `billing helper ${helper} must be defined`,
  );
}

for (const field of [
  "billingStatus",
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
}

assertIncludes(
  adminPanel,
  "billingStatus",
  "admin settings UI must expose billingStatus",
);
assertIncludes(
  billingPanel,
  "BillingStatusBadge",
  "billing settings UI must show billing status badge",
);
assertIncludes(
  billingPanel,
  "BillingStatusActions",
  "billing settings UI must expose upgrade/reactivate actions",
);

const trialExpiryCron = readText("app/api/cron/billing-trial-expiry/route.ts");
assertIncludes(
  trialExpiryCron,
  "expireExpiredTrials",
  "billing trial expiry cron must persist expired trials",
);

assertIncludes(
  featureFlags,
  "system_settings",
  "feature flags must read tenant billing settings",
);
assertIncludes(
  featureFlags,
  "applyBillingToFeatureFlags",
  "feature flags must apply plan and billing status gates",
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
  "BILLING_STATUSES",
  "admin settings UI must use canonical billing statuses",
);

console.log("Billing readiness contract check passed.");
