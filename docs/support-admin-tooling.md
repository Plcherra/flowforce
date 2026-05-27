# Support And Admin Tooling

Date: 2026-05-27

## Scope

Phase 03.08 adds the first internal support tooling contract for tenant diagnostics and safe repair. The goal is to let support understand and repair broken tenant setup without direct database edits.

## Protection Model

Internal support tooling is served from:

```text
/api/internal/support/tenant
```

The route requires:

- `SUPPORT_ADMIN_TOKEN` configured on the server.
- `x-support-token` matching that value.
- optional `x-support-actor` identifying the support operator or automation.

If `SUPPORT_ADMIN_TOKEN` is missing, the route returns `503` and cannot be used. This keeps local or incomplete deployments from exposing a privileged path by accident.

## Diagnostics

Use `GET /api/internal/support/tenant?companyId=<uuid>&userId=<uuid>`.

Diagnostics return:

- tenant setup health: `healthy`, `degraded`, or `critical`.
- missing baseline pieces.
- company and owner profile summary.
- counts for memberships, settings, roles, setup audit events, exports, and active legal holds.
- onboarding setup verification details when `userId` is provided.
- the current impersonation decision.

Every diagnostic run writes:

- a `support_tool_runs` row.
- a `support.tenant_diagnostics_viewed` audit event.
- a service-role audit log line through `auditServiceRoleOperation`.

## Repair

Use `POST /api/internal/support/tenant` with:

```json
{
  "companyId": "uuid",
  "userId": "uuid",
  "action": "repair_onboarding_baseline",
  "dryRun": true
}
```

Dry-run is the default and returns before-state diagnostics without mutating records.

Set `"dryRun": false` to repair the onboarding baseline. The repair can restore:

- owner profile company assignment, role, admin flag, and active status.
- company owner and registration completion.
- owner company membership.
- system settings row.
- default company roles.
- setup audit event.

Every executed repair writes:

- a `support_tool_runs` row.
- a `company.setup_verified` audit event.
- a `support.tenant_repair_executed` audit event.
- a service-role audit log line through `auditServiceRoleOperation`.

## Impersonation Decision

Support impersonation is blocked for v1.

Support staff should use:

- read-only diagnostics.
- dry-run repair previews.
- audited repair actions.
- tenant-admin screen sharing when needed.

A later enterprise support phase can revisit impersonation only with tenant consent, short time windows, explicit approval, and immutable audit logs.

## Health Indicators

Tenant health checks cover:

- company row.
- owner profile.
- owner membership.
- system settings.
- company roles.
- setup audit event.
- billing state.
- lifecycle state.
- legal holds.

The route currently reports the setup and legal-hold portions directly. Billing/lifecycle fields are included in the returned company/settings data and should become admin-facing UI indicators in a later support console phase.

## Verification

Run:

```bash
npm run check:support
```

This confirms the route is token-protected, repair actions are audited, support-run storage exists, impersonation stays blocked, and the roadmap points to the next phase.
