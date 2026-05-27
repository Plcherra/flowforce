import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const fail = (message) => {
  throw new Error(`[audit-activity-contract] ${message}`);
};

const assertIncludes = (text, pattern, message) => {
  if (!text.includes(pattern)) fail(message);
};

const auditEvents = readText("src/services/audit/auditEvents.ts");
const auditService = readText("src/services/audit/auditService.ts");
const featureFlags = readText("src/config/featureFlags.ts");
const userPermissions = readText("src/hooks/useUserPermissions.tsx");
const userManagement = readText(
  "src/features/admin/hooks/useUserManagementMutations.ts",
);
const roleManager = readText("src/features/roles/components/RoleManager.tsx");
const systemSettings = readText(
  "src/features/system/hooks/useSystemSettings.ts",
);
const auditLogUi = readText("src/features/admin/components/AuditLog.tsx");
const inviteRoute = readText("app/api/employees/invite/route.ts");
const auditMigration = readText(
  "supabase/migrations/20260527000200_phase3_audit_activity_contract.sql",
);

for (const category of [
  "onboarding",
  "user",
  "permission",
  "settings",
  "billing",
  "integration",
  "ai",
  "data",
  "security",
]) {
  assertIncludes(
    auditEvents,
    `"${category}"`,
    `audit category ${category} must be defined`,
  );
}

for (const action of [
  "company.setup_verified",
  "invite.created",
  "employee.invite.created",
  "employee.invite.email_failed",
  "user.role_updated",
  "user.status_updated",
  "permission.overrides_updated",
  "system_settings.updated",
]) {
  assertIncludes(
    auditEvents,
    action,
    `audit action ${action} must be registered`,
  );
}

assertIncludes(
  auditService,
  "event_metadata",
  "audit service must pass metadata to the audit RPC",
);
assertIncludes(
  auditMigration,
  "event_metadata jsonb",
  "audit RPC migration must persist event metadata",
);
assertIncludes(
  featureFlags,
  "auditLogs: true",
  "admin audit review UI must be enabled",
);

assertIncludes(
  userManagement,
  "AUDIT_ACTIONS.userRoleUpdated",
  "admin role changes must be audited",
);
assertIncludes(
  roleManager,
  "AUDIT_ACTIONS.userRoleUpdated",
  "role manager assignment changes must be audited",
);
assertIncludes(
  userManagement,
  "AUDIT_ACTIONS.userStatusUpdated",
  "employee activation status changes must be audited",
);
assertIncludes(
  userPermissions,
  "AUDIT_ACTIONS.permissionOverridesUpdated",
  "permission override changes must be audited",
);
assertIncludes(
  systemSettings,
  "AUDIT_ACTIONS.settingsUpdated",
  "settings, billing, integration, and AI settings changes must be audited",
);
assertIncludes(
  inviteRoute,
  "AUDIT_ACTIONS.employeeInviteCreated",
  "server employee invites must be audited",
);
assertIncludes(
  auditLogUi,
  "Activity Audit Log",
  "admin UI must expose general activity review",
);
assertIncludes(
  auditLogUi,
  "metadata?.category",
  "admin UI must display audit categories",
);

console.log(
  "OK audit activity contract: categories, events, UI, key mutations",
);
