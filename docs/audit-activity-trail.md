# Audit Logs And Activity Trail

Date: 2026-05-27

## Canonical Store

FlowForce uses `public.audit_log` as the canonical audit table and `public.audit_logs` as the compatibility read view for admin UI.

Audit writes should use `logAuditEvent()` in [auditService.ts](/Users/pedromartins/Documents/flowforce/src/services/audit/auditService.ts) or a server-side insert that includes the same metadata contract.

## Categories

The v1 audit categories are defined in [auditEvents.ts](/Users/pedromartins/Documents/flowforce/src/services/audit/auditEvents.ts):

- `onboarding`
- `user`
- `permission`
- `settings`
- `billing`
- `integration`
- `ai`
- `data`
- `security`

Every registered event has a severity and retention class:

- `info`: normal trace event.
- `warning`: sensitive operational change.
- `critical`: access-control or privilege change.
- `standard`: retain for normal support/compliance review.
- `extended`: retain longer because the event changes access, setup, or governance.

## Critical Events

Current critical or privileged paths:

- `company.setup_verified`
- `invite.created`
- `employee.invite.created`
- `employee.invite.email_failed`
- `user.role_updated`
- `user.status_updated`
- `permission.overrides_updated`
- `system_settings.updated`

`system_settings.updated` covers company settings plus billing, integration, AI, security, notification, and tenant-management settings because those values are grouped under `system_settings`.

## Admin Review

The admin audit UI is enabled by default through `admin.auditLogs`.

Admins can review recent activity in:

- `/app/admin?tab=audit`
- `/app/settings`, Admin tab, Recent audit activity

## Retention Policy

V1 retention policy:

- Standard events: retain at least 180 days.
- Extended events: retain at least 24 months.
- Do not delete audit rows during ordinary user/profile cleanup.
- Any future purge job must filter by `metadata.retention`, tenant, and minimum age, and it must never remove critical access-control events before the extended window.

## Verification

Run:

```bash
npm run check:audit
```

This confirms:

- Audit categories and critical event names are registered.
- Audit metadata is passed to `log_audit_event`.
- Admin audit review UI is enabled.
- Key user, permission, settings, invite, billing, integration, and AI settings mutations are audited.
