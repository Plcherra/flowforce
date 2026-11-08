import assert from "node:assert/strict";
import {
  describeActivity,
  humanizeAuditAction,
  settingsChangeDetails,
} from "./activityHistory";

const labels: Record<string, string> = {
  "settings.activityChangedLanguage": "Changed language from {{from}} to {{to}}",
  "settings.activityRenamedCompany": "Renamed company to {{name}}",
  "settings.activityTurnedOnPack": "Turned on {{pack}} pack",
  "settings.activityTurnedOffPack": "Turned off {{pack}} pack",
  "settings.activityChangedStoreHours": "Changed store hours for {{store}}",
  "settings.activityChangedSettings": "Changed company settings",
  "settings.languageName.en": "English",
  "settings.languageName.pt": "Portuguese",
  "packs.stock.title": "Stock",
  "literals.unknown": "Unknown",
};

function t(key: string, options?: Record<string, unknown>) {
  let text = labels[key] ?? key;
  if (options) {
    for (const [name, value] of Object.entries(options)) {
      text = text.replace(`{{${name}}}`, String(value));
    }
  }
  return text;
}

export function runActivityHistoryTests() {
  const details = settingsChangeDetails(
    {
      localization: { language: "en" },
      general: { companyName: "Old" },
      admin_config: {
        packFlags: { stock: false },
        businessStructure: {
          locations: [{ name: "High Street", hours: { start: "09:00" } }],
        },
      },
    },
    {
      localization: { language: "pt" },
      general: { companyName: "New Cafe" },
      admin_config: {
        packFlags: { stock: true },
        businessStructure: {
          locations: [{ name: "High Street", hours: { start: "08:00" } }],
        },
      },
    },
  );

  assert.equal(
    describeActivity(t, { action: "system_settings.updated", metadata: { details } }),
    "Changed language from English to Portuguese Renamed company to New Cafe Turned on Stock pack Changed store hours for High Street",
  );
  assert.equal(
    describeActivity(t, { action: "system_settings.updated", metadata: null }),
    "Changed company settings",
  );
  assert.equal(
    describeActivity(t, {
      action: "system_settings.updated",
      metadata: { pack: "stock", packEnabled: true },
    }),
    "Turned on Stock pack",
  );
  assert.equal(humanizeAuditAction("employee.invite_created"), "Employee invite created");
  assert.equal(
    describeActivity(t, { action: "employee.invite_created" }),
    "Employee invite created",
  );
}
