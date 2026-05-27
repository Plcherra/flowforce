# 03.05 Audit Logs And Activity Trail

Date: 2026-05-27

## Summary

Phase 03.05 turns audit logging into a product contract with categories, metadata, review UI, and coverage checks for privileged mutations.

## Completed

- Defined v1 audit categories, event names, severity, and retention classes.
- Extended `log_audit_event` to persist structured event metadata.
- Updated `logAuditEvent()` to attach category, severity, and retention metadata.
- Enabled the admin audit log review UI by default.
- Expanded the admin audit UI from role-only display to general activity review.
- Audited role changes from the role manager and admin user-management mutation path.
- Audited employee activation/deactivation changes.
- Standardized permission override, settings, invite, and employee-invite audit action names.
- Documented retention policy and review surfaces in `docs/audit-activity-trail.md`.
- Added `npm run check:audit` to guard audit categories, event names, metadata, UI, and key mutation coverage.

## Verification

- `npm run check:audit`

## Notes

- `system_settings.updated` currently covers billing, integration, AI, security, and tenant-management settings because those values are grouped in `system_settings`.
- Future deeper product phases should add domain-specific audit events for billing subscriptions, integrations, AI approvals, inventory transfers, and scheduling automation as those workflows become production-write paths.
