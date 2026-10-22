export const SETTINGS_TAB_KEYS = [
  "general",
  "security",
  "localization",
  "notifications",
  "copilot",
  "integrations",
  "billing",
] as const;

export type SettingsTabKey = (typeof SETTINGS_TAB_KEYS)[number];

export const SETTINGS_CONTROL_GATES = {
  billing: { tab: "billing", permission: "billing.manage" },
  export: { permission: "systemSettings" },
  audit: { permission: "systemSettings" },
  danger: { permission: "systemSettings" },
  userManagement: {
    permission: "manageUsers",
    surface: "employee-directory",
  },
} as const;

export function collectNavigationHrefs(
  sections: readonly {
    items?: readonly { href?: string | null }[] | null;
  }[],
): string[] {
  return sections.flatMap((section) =>
    (section.items ?? []).map((item) => item.href ?? ""),
  );
}
