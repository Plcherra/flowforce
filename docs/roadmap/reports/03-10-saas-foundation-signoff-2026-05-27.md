# 03.10 SaaS Foundation Signoff

Date: 2026-05-27

## Decision

Plan 03 is signed off for v1 foundation work.

FlowForce now has a documented SaaS baseline for tenant ownership, onboarding, roles, settings, auditability, billing readiness, data lifecycle, support tooling, and security review. The foundation is strong enough to continue into visible web app completion without changing the core tenant model.

## Frozen V1 Foundation Decisions

- `company_members` is the long-term tenant membership source.
- `profiles.company_id` remains the current-company shortcut.
- New tenant-owned tables must carry `company_id` and follow the company membership policy pattern.
- Onboarding setup must be idempotent and recoverable.
- Owner, admin, manager, and staff remain the default product roles for v1.
- Company settings are real configuration, not disconnected UI state.
- Critical tenant, role, billing, integration, AI, support, and data lifecycle actions must be auditable.
- Billing is readiness-only for now: plans, statuses, and feature gates exist before payment-provider integration.
- Support tools are service-protected and audited.
- Support impersonation is blocked for v1.
- Secrets must stay out of Git and out of client-visible code.

## Completed Foundation Reports

- [03.01 Tenant Model Confirmation](./03-01-tenant-model-confirmation-2026-05-27.md)
- [03.02 Onboarding Production Hardening](./03-02-onboarding-production-hardening-2026-05-27.md)
- [03.03 Roles And Permissions Productization](./03-03-roles-and-permissions-productization-2026-05-27.md)
- [03.04 Company Settings System](./03-04-company-settings-system-2026-05-27.md)
- [03.05 Audit Logs And Activity Trail](./03-05-audit-logs-and-activity-trail-2026-05-27.md)
- [03.06 Billing Readiness](./03-06-billing-readiness-2026-05-27.md)
- [03.07 Data Lifecycle And Retention](./03-07-data-lifecycle-and-retention-2026-05-27.md)
- [03.08 Support And Admin Tooling](./03-08-support-and-admin-tooling-2026-05-27.md)
- [03.09 Security Review Pass](./03-09-security-review-pass-2026-05-27.md)

## Launch Checklist Update

Added `docs/checklists/LAUNCH-READINESS-CHECKLIST.md` as the current launch-readiness tracker.

The checklist separates what is now complete in the SaaS foundation from what still blocks a paid pilot: visible web app completion, cost engine, operations workflows, AI safety, mobile path, import/export, infrastructure, monitoring, backups, and release operations.

## Remaining Post-V1 SaaS Enhancements

- Multi-company switching beyond the current-company shortcut.
- Payment-provider integration and customer self-serve billing portal.
- Support impersonation with explicit customer-visible consent and audit trail.
- Automated data export fulfillment and customer-facing deletion workflows.
- Deeper compliance retention presets by jurisdiction and customer type.
- Fine-grained custom role builder beyond the default product roles.
- Advanced admin health dashboards and customer-facing trust/status pages.
- Native mobile offline support after the web/PWA path is proven.

## Verification

- Passed: `npm run check:local`
- Passed: `npm run typecheck`
- Passed: `npm run build`
- Passed: retired vendor/app mention scan
- Remote Supabase migrations are aligned through `20260527000400`.

## Known Follow-Up

The local Supabase DB security suite still needs a fresh local database reset against the current migrations before it can be used as a clean local release signal. Remote Supabase drift and contract checks are aligned, and the next phase should focus on visible web app route/module readiness.

## Next Phase

Continue to Roadmap 04, Phase 04.01: Visible Module Inventory.
