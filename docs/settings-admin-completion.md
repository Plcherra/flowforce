# Settings And Admin Completion

Date: 2026-05-28

Purpose: define the pilot-ready admin and settings surface for workspace configuration.

## Product Rule

Admins must be able to configure the workspace without developer help:

- Company profile, localization, security, notifications, AI, integrations, and tenant admin settings must be visible from one settings area.
- Configuration completeness must be visible before pilot launch.
- Integration and admin gaps must be actionable.
- High-risk admin actions must require explicit confirmation.
- Audit activity must be linked from the settings experience.

## Readiness Surface

The settings page now includes a Settings Readiness panel with:

- Overall configuration completion score.
- Company profile status.
- Security/RLS status.
- Integration status.
- Billing/admin status.
- AI governance status.
- Review items for missing contact info, RLS issues, admin MFA gaps, seat overages, integration errors, and unaudited AI autopilot.

## Admin Safety

The Admin tab now includes a high-risk action area:

- Export current settings backup as JSON.
- Require workspace-name confirmation before dangerous actions unlock.
- Stage workspace deactivation for admin/billing review.
- Stage AI automation pause and return automation to suggestion mode.
- Keep staged changes unsaved until the admin explicitly saves admin settings.

## Audit Links

The settings readiness panel links directly to the Admin tab, where recent audit activity is shown from the audit log query. System settings updates continue to be recorded through the existing `logAuditEvent` path.

## Deferred

Later phases should add:

- Server-side execution endpoints for irreversible tenant actions.
- Dedicated support/admin dashboard for tenant diagnostics beyond settings.
- More granular feature-flag editing once pricing and packaging are finalized.
- Route-level QA and mobile layout checks in 04.10.
