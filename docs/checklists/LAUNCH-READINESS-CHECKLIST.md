# Launch Readiness Checklist

Date: 2026-05-27

Purpose: track what must be true before FlowForce is offered to paid pilot customers.

## Current Status

- [x] Product positioning is frozen for v1.
- [x] Architecture baseline is frozen for v1.
- [x] Core SaaS foundation is signed off.
- [x] Web app product surface is production-quality.
- [ ] Cost engine is connected to real inventory, purchasing, labor, and waste data.
- [ ] Operations workflows are ready for restaurant/retail execution.
- [ ] AI recommendations are evidence-based, approval-gated, and audited.
- [ ] Mobile path is selected and validated on real devices.
- [ ] Import/export and migration tools are pilot-ready.
- [ ] Production infrastructure, monitoring, backup, rollback, and support playbooks are tested.

## SaaS Foundation

- [x] Tenant source of truth is `company_members`.
- [x] Tenant shortcut is `profiles.company_id`.
- [x] Onboarding can create company, profile, membership, roles, settings, and audit rows.
- [x] Onboarding recovery is idempotent.
- [x] Product roles and permissions are documented and contract-checked.
- [x] Company settings are normalized and audited.
- [x] Critical activity is audit-logged.
- [x] Billing readiness supports plans, status, and feature gates.
- [x] Data lifecycle supports export, retention, legal holds, and recoverability planning.
- [x] Support tooling is token-protected, service-only, and audited.
- [x] Secrets are excluded from Git tracking.
- [x] Retired vendor/app mentions are blocked by a local contract.

## Web App Pilot Surface

- [x] Every visible route has production, beta, hidden, or deprecated status.
- [x] Navigation only exposes usable product surfaces.
- [x] Dashboard shows operator-critical work, not generic metrics.
- [ ] Inventory and purchasing flows use real tenant data or clear empty states.
- [x] Employee and HR flows use real tenant data and clear empty states.
- [x] Scheduling flows support draft creation, assignment review, conflict warnings, and labor cost readiness.
- [x] Tasks and goals flows support assignment, status workflows, comments, reminders, recurring follow-up, and readiness review.
- [x] Messages and company updates support channels, read state, attachments, publishing, comments, reactions, and readiness review.
- [x] Forms and sections support builder, submissions, advanced fields, custom pages, permissions, storage-aware fields, and readiness review.
- [x] Analytics and reports support tenant-scoped summaries, owner/manager views, CSV exports, cost signals, and AI context readiness.
- [x] Settings and admin support completeness indicators, integrations shell, audit links, and confirmation-gated high-risk actions.
- [x] Demo-only data is removed from production-facing flows.
- [x] Mobile and desktop layouts are QA'd for overflow, loading loops, and console errors.
- [x] Authenticated production sidebar smoke passes on desktop and mobile viewports.

## Cost Engine

- [x] Canonical cost terms are defined for labor, inventory, purchasing, waste, production, and shift cost.
- [x] Cost precision, currency, tenant rules, and permission rules are documented.
- [x] Inventory item/unit cost basis is reliable.
- [x] Recipe and production costing are fully connected.
- [x] Counts and stock position rollups are reliable.
- [x] Purchasing receipts update inventory and cost basis.
- [x] Waste events calculate cost impact consistently.
- [x] Schedule labor cost rollups are tenant-scoped.
- [x] Shift/day/location profitability summaries are available.
- [x] Owner financial overview separates actual, estimated, and imported data.
- [x] Cost engine regression tests cover key labor, production, waste, owner finance, and demo-exclusion calculations.

## Security And Data

- [x] Remote migration history is aligned with local migrations.
- [x] Remote Supabase schema/security contract passes.
- [x] Public/client code does not receive service secrets.
- [x] Support admin route requires `SUPPORT_ADMIN_TOKEN`.
- [x] Local Supabase security test database is reset and re-run from current migrations.
- [ ] Backup and restore process is tested with a pilot-shaped tenant.
- [ ] Sensitive file storage is verified with signed URL/private bucket rules.

## Release Gates

- [x] `npm run check:local` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] Local database security suite passes from a clean local Supabase reset.
- [ ] `npm run check:release` passes from a clean local Supabase reset.
- [ ] GitHub Release Gates pass with repository secrets.
- [ ] GitHub Deploy Readiness passes with repository secrets.
- [ ] Rollback instructions are documented and tested.

## Support And Operations

- [x] Support impersonation is explicitly blocked for v1.
- [x] Tenant diagnostics and repair actions are service-protected.
- [x] Support tool runs are recorded.
- [ ] Support runbook covers onboarding repair, tenant status, billing state, and data export requests.
- [ ] Incident response owners and severity levels are documented.
- [ ] Customer-facing pilot setup checklist is written.

## Final Launch Decision

FlowForce is not launch-ready until Plans 04 through 10 are complete or explicitly scoped down for a paid pilot.

The current foundation is ready for the next build stage: completing and QA'ing the visible web app.
