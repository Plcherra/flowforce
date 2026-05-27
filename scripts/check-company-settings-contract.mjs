import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const fail = (message) => {
  throw new Error(`[company-settings-contract] ${message}`);
};

const assertIncludes = (text, pattern, message) => {
  if (!text.includes(pattern)) fail(message);
};

const assertNotIncludes = (text, pattern, message) => {
  if (text.includes(pattern)) fail(message);
};

const useSystemSettings = readText(
  "src/features/system/hooks/useSystemSettings.ts",
);
const useGeneralSettings = readText(
  "src/features/system/hooks/useGeneralSettings.ts",
);
const useLocalizationSettings = readText(
  "src/features/system/hooks/useLocalizationSettings.ts",
);
const normalizer = readText(
  "src/features/system/hooks/systemSettingsNormalizer.ts",
);
const useCurrency = readText("src/hooks/useCurrency.tsx");
const analyticsBoard = readText(
  "src/features/analytics/components/BusinessAnalyticsBoard.tsx",
);
const generalPanel = readText(
  "src/features/system/components/GeneralSettingsPanel.tsx",
);

assertIncludes(
  useSystemSettings,
  "logAuditEvent",
  "settings updates must write audit events",
);
assertIncludes(
  useSystemSettings,
  "AUDIT_ACTIONS.settingsUpdated",
  "settings audit action must be stable",
);

for (const field of ["primary_color", "secondary_color"]) {
  assertIncludes(
    useGeneralSettings,
    field,
    `general settings save must propagate ${field} to companies`,
  );
}
for (const field of ["primaryColor", "secondaryColor"]) {
  assertIncludes(
    generalPanel,
    field,
    `general settings UI must expose ${field} preview/edit controls`,
  );
  assertIncludes(
    useGeneralSettings,
    field,
    `general settings save must persist ${field} to appearance settings`,
  );
  assertIncludes(
    normalizer,
    field,
    `settings normalizer must read ${field} from company configuration`,
  );
}

for (const field of ["timezone", "currency"]) {
  assertIncludes(
    useLocalizationSettings,
    field,
    `localization save must include ${field}`,
  );
}
assertIncludes(
  useLocalizationSettings,
  '.from("companies")',
  "localization save must update the companies row",
);
assertIncludes(
  useLocalizationSettings,
  "updateSettings({ localization: state })",
  "localization save must update the system settings snapshot",
);

assertIncludes(
  useCurrency,
  "useCompany",
  "currency formatting must read company-level currency",
);
assertIncludes(
  analyticsBoard,
  "useCurrency",
  "analytics reports must use company currency formatting",
);
assertNotIncludes(
  analyticsBoard,
  'currency: "USD"',
  "analytics reports must not hard-code USD formatting",
);

console.log("OK company settings contract: profile, brand, currency, timezone");
