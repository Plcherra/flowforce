import assert from "node:assert/strict";
import {
  buildCreateCompanyData,
  buildGeneralAppearanceSave,
  buildGeneralCompanyUpdate,
  buildOnboardingCompanyPayload,
} from "./companySavePayload";

const COLOR_KEYS = [
  "primary_color",
  "secondary_color",
  "primaryColor",
  "secondaryColor",
] as const;

function assertNoCompanyColors(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoCompanyColors(item);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assert.equal(COLOR_KEYS.includes(key as (typeof COLOR_KEYS)[number]), false, key);
    assertNoCompanyColors(child);
  }
}

export function runCompanySavePayloadTests() {
  const companyUpdate = buildGeneralCompanyUpdate({
    name: "North Cafe",
    description: "Cafe",
    website: "https://north.example",
    phone: "555",
    logoUrl: "https://cdn.example/logo.png",
  });
  assert.equal(companyUpdate.name, "North Cafe");
  assert.equal(companyUpdate.logo_url, "https://cdn.example/logo.png");
  assertNoCompanyColors(companyUpdate);

  const appearance = buildGeneralAppearanceSave({
    theme: "light",
    primaryColor: "#ff0000",
    secondaryColor: "#00ff00",
    primary_color: "#3b82f6",
    secondary_color: "#1e40af",
    accentColor: "#0ea5e9",
    logoBackgroundColor: "#ffffff",
  });
  assert.equal(appearance.theme, "light");
  assert.equal(appearance.accentColor, "#0ea5e9");
  assertNoCompanyColors(appearance);

  const onboarding = buildOnboardingCompanyPayload({
    name: "North Cafe",
    website: "https://north.example",
    phone: null,
    industry: "food",
    size: "1-10",
    description: null,
    templateName: "Cafe",
    templateId: "cafe",
    templateIndustry: "food",
    defaultRoles: [],
    customFields: {},
    suggestedPositions: {},
    enabledSections: ["schedule"],
    customRoles: [],
    positions: [],
    userId: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    ownerPhone: null,
  });
  assert.equal(onboarding.name, "North Cafe");
  assert.equal(onboarding.registration_complete, true);
  assertNoCompanyColors(onboarding);

  const created = buildCreateCompanyData({
    name: "Demo Workspace",
    industry: null,
    size: null,
    description: "Automatically generated workspace",
    website: null,
    phone: null,
    templateId: null,
    templateName: null,
    enabledSections: [],
    templateConfig: "{}",
  });
  assert.equal(created.name, "Demo Workspace");
  assertNoCompanyColors(created);
}
