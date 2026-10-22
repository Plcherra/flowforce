import type { PermissionKey } from "@/lib/permissions/registry";
import type { PermissionDiffMap } from "./personAccessDiffs";
import { permissionAllowedAtLevel, type ProductLevel } from "./productLevels";

export const ACCESS_SWITCH_TYPES = [
  "read",
  "create",
  "edit",
  "delete",
  "grant",
] as const;

export type AccessSwitchType = (typeof ACCESS_SWITCH_TYPES)[number];

export type AccessSwitch = {
  id: AccessSwitchType;
  label: string;
  keys: PermissionKey[];
  ownerLocked?: boolean;
};

export type AccessRow = {
  id: string;
  label: string;
  labelKey?: string;
  switches: AccessSwitch[];
};

const WRITE_SWITCH_TYPES = new Set<AccessSwitchType>(["create", "edit", "delete"]);

export function accessSwitchTypeAllowed(id: string): id is AccessSwitchType {
  return (ACCESS_SWITCH_TYPES as readonly string[]).includes(id);
}

export function rowShowsWriteSwitch(row: AccessRow): boolean {
  return row.switches.some((item) => WRITE_SWITCH_TYPES.has(item.id));
}

export const ACCESS_ROWS: AccessRow[] = [
  { id: "own_profile", label: "Own profile", switches: [
    { id: "read", label: "Read", keys: ["viewOwnProfile"] },
    { id: "edit", label: "Edit", keys: ["editOwnProfile"] },
  ]},
  { id: "team_profiles", label: "Team profiles", switches: [
    { id: "read", label: "Read", keys: ["viewTeamProfiles"] },
    { id: "edit", label: "Edit", keys: ["editTeamProfiles"], ownerLocked: true },
  ]},
  { id: "own_schedule", label: "Own schedule", switches: [
    { id: "read", label: "Read", keys: ["viewOwnSchedules"] },
  ]},
  { id: "team_schedule", label: "Team schedule", switches: [
    { id: "read", label: "Read", keys: ["viewTeamSchedules", "schedule.view"] },
  ]},
  { id: "shifts", label: "Shifts", switches: [
    { id: "create", label: "Create", keys: ["schedule.create"] },
    { id: "edit", label: "Edit", keys: ["schedule.edit", "editSchedules"] },
    { id: "delete", label: "Delete", keys: ["schedule.delete"] },
  ]},
  { id: "schedule_grant", label: "Schedule access", switches: [
    { id: "grant", label: "Grant", keys: ["schedule.grant"] },
  ]},
  { id: "reminders", label: "Reminders", switches: [
    { id: "create", label: "Create", keys: ["schedule.reminders.assign"] },
    { id: "grant", label: "Grant", keys: ["schedule.reminders.grant_deactivate"] },
  ]},
  { id: "own_tasks", label: "Own tasks", switches: [
    { id: "read", label: "Read", keys: ["viewOwnTasks"] },
  ]},
  { id: "team_tasks", label: "Team tasks", switches: [
    { id: "read", label: "Read", keys: ["viewTeamTasks"] },
    { id: "edit", label: "Edit", keys: ["editTasks"] },
  ]},
  { id: "submitted_forms", label: "Submitted forms", switches: [
    { id: "read", label: "Read", keys: ["forms.submissions.read"] },
  ]},
  { id: "form_templates", label: "Form templates", switches: [
    { id: "create", label: "Create", keys: ["createForms"] },
    { id: "edit", label: "Edit", keys: ["manageForms"] },
    { id: "delete", label: "Delete", keys: ["manageForms"] },
  ]},
  { id: "form_approval", label: "Form submissions", switches: [
    { id: "edit", label: "Edit", keys: ["approveFormSubmissions"] },
  ]},
  { id: "own_expenses", label: "Own expenses", switches: [
    { id: "read", label: "Read", keys: ["viewOwnExpenses"] },
  ]},
  { id: "team_expenses", label: "Team expenses", switches: [
    { id: "read", label: "Read", keys: ["viewTeamExpenses"] },
  ]},
  { id: "expense_approval", label: "Expenses", switches: [
    { id: "edit", label: "Edit", keys: ["approveExpenses"] },
  ]},
  { id: "time_off", label: "Time off", switches: [
    { id: "edit", label: "Edit", keys: ["approveTimeOff"] },
  ]},
  { id: "inventory_items", label: "Inventory items", switches: [
    { id: "read", label: "Read", keys: ["inventory.view"] },
    { id: "create", label: "Create", keys: ["inventory.create"] },
    { id: "edit", label: "Edit", keys: ["inventory.edit", "manageInventory"] },
    { id: "delete", label: "Delete", keys: ["inventory.delete"] },
  ]},
  { id: "inventory_adjust", label: "Inventory adjust", switches: [
    { id: "edit", label: "Edit", keys: ["inventory.adjust"] },
  ]},
  { id: "inventory_import", label: "Inventory import", switches: [
    { id: "create", label: "Create", keys: ["inventory.import"] },
  ]},
  { id: "inventory_export", label: "Inventory export", switches: [
    { id: "read", label: "Read", keys: ["inventory.export"] },
  ]},
  { id: "purchasing", label: "Purchasing", switches: [
    { id: "read", label: "Read", keys: ["inventory.purchasing.view"] },
    { id: "edit", label: "Edit", keys: ["inventory.purchasing.manage"] },
  ]},
  { id: "counts", label: "Counts", switches: [
    { id: "read", label: "Read", keys: ["inventory.counts.view"] },
    { id: "create", label: "Create", keys: ["inventory.counts.create"] },
    { id: "edit", label: "Edit", keys: ["inventory.counts.edit"] },
  ]},
  { id: "count_approval", label: "Count approval", labelKey: "settings.accessCountApproval", switches: [
    { id: "edit", label: "Edit", keys: ["inventory.counts.approve"] },
  ]},
  { id: "waste", label: "Waste", switches: [
    { id: "read", label: "Read", keys: ["inventory.waste.view"] },
    { id: "create", label: "Create", keys: ["inventory.waste.create"] },
  ]},
  { id: "prep", label: "Prep", switches: [
    { id: "read", label: "Read", keys: ["inventory.prep.view"] },
    { id: "edit", label: "Edit", keys: ["inventory.prep.edit"] },
  ]},
  { id: "reports", label: "Reports", switches: [
    { id: "read", label: "Read", keys: ["reports.view"] },
  ]},
  { id: "reports_export", label: "Reports export", labelKey: "settings.accessReportsExport", switches: [
    { id: "read", label: "Read", keys: ["reports.export"] },
  ]},
  { id: "ai_insights", label: "AI insights", switches: [
    { id: "read", label: "Read", keys: ["viewAIInsights", "ai.insights.view"] },
  ]},
  { id: "ai_suggest", label: "AI suggestions", switches: [
    { id: "create", label: "Create", keys: ["ai.actions.suggest"] },
  ]},
  { id: "ai_approve", label: "AI approval", switches: [
    { id: "edit", label: "Edit", keys: ["ai.actions.approve"] },
  ]},
  { id: "ai_audit", label: "AI audit", switches: [
    { id: "read", label: "Read", keys: ["ai.audit.view"] },
  ]},
  { id: "ai_automate", label: "AI automation", switches: [
    { id: "edit", label: "Edit", keys: ["ai.actions.automate"] },
  ]},
  { id: "ai_governance", label: "AI governance", switches: [
    { id: "edit", label: "Edit", keys: ["ai.governance.manage"] },
  ]},
  { id: "directory", label: "Directory", switches: [
    { id: "read", label: "Read", keys: ["directory.view"] },
    { id: "edit", label: "Edit", keys: ["directory.manage"], ownerLocked: true },
  ]},
  { id: "positions", label: "Positions and classes", switches: [
    { id: "edit", label: "Edit", keys: ["managePositions", "admin.roles", "admin.permissions"], ownerLocked: true },
  ]},
  { id: "people", label: "People", switches: [
    { id: "create", label: "Create", keys: ["manageUsers"], ownerLocked: true },
    { id: "delete", label: "Delete", keys: ["manageUsers"], ownerLocked: true },
  ]},
  { id: "billing", label: "Billing", switches: [
    { id: "read", label: "Read", keys: ["billing.view"], ownerLocked: true },
    { id: "edit", label: "Edit", keys: ["billing.manage"], ownerLocked: true },
  ]},
  { id: "settings", label: "Company settings", switches: [
    { id: "edit", label: "Edit", keys: ["systemSettings", "admin.settings", "managePayments"], ownerLocked: true },
  ]},
];

export function findAccessSwitch(rowId: string, switchId: string): AccessSwitch | undefined {
  return ACCESS_ROWS.find((row) => row.id === rowId)?.switches.find(
    (item) => item.id === switchId,
  );
}

export function accessSwitchVisible(level: ProductLevel, item: AccessSwitch): boolean {
  return item.keys.some((key) => permissionAllowedAtLevel(level, key));
}

export function accessSwitchOn(
  permissions: Record<string, boolean> | null | undefined,
  item: AccessSwitch,
): boolean {
  return item.keys.every((key) => Boolean(permissions?.[key]));
}

export function projectAccessPermissions(
  permissions: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const next: Record<string, boolean> = { ...(permissions ?? {}) };
  for (const row of ACCESS_ROWS) {
    for (const item of row.switches) {
      const on = accessSwitchOn(permissions, item);
      for (const key of item.keys) next[key] = on;
    }
  }
  return next;
}

export function diffsForAccessSwitch(
  classPermissions: Record<string, boolean> | null | undefined,
  diffs: PermissionDiffMap,
  rowId: string,
  switchId: string,
  enabled: boolean,
): PermissionDiffMap {
  const item = findAccessSwitch(rowId, switchId);
  if (!item) return diffs;
  const next: PermissionDiffMap = { ...diffs };
  for (const key of item.keys) {
    const classOn = Boolean(classPermissions?.[key]);
    if (enabled === classOn) delete next[key];
    else next[key] = enabled ? "allow" : "deny";
  }
  return next;
}

export function submittedFormsHidden(source: string): boolean {
  return source === "deny_override";
}

export function accessKeys(): PermissionKey[] {
  return ACCESS_ROWS.flatMap((row) => row.switches.flatMap((item) => item.keys));
}
