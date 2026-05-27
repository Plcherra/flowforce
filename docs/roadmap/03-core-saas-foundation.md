# 03 Core SaaS Foundation

## Goal

Make FlowForce reliable as a multi-tenant SaaS: onboarding, accounts, companies, roles, permissions, settings, auditability, billing readiness, and data safety.

## Phases

### Phase 1: Tenant Model Confirmation

- [ ] Confirm `company_members` as long-term membership source.
- [ ] Confirm `profiles.company_id` as current-company shortcut.
- [ ] Document multi-company behavior.
- [ ] Document tenant ownership rules for every new table.

Acceptance:

- All future policies follow one tenant rule.

Verification:

- Supabase security tests encode the rule.

### Phase 2: Onboarding Production Hardening

- [ ] Verify account creation creates company, profile, membership, roles, settings, and audit rows.
- [ ] Add recovery for interrupted setup.
- [ ] Improve error visibility for failed setup.
- [ ] Add onboarding smoke coverage for production-like env.

Acceptance:

- New customers do not get half-created tenants.

Verification:

- Onboarding E2E passes and retries are idempotent.

### Phase 3: Roles And Permissions Productization

- [ ] Define default roles for owner, admin, manager, staff.
- [ ] Map route/module permissions to product roles.
- [ ] Add UI for role assignment and review.
- [ ] Add tests for permission-sensitive modules.

Acceptance:

- Role behavior is understandable and enforceable.

Verification:

- Staff cannot access manager/admin-only actions.

### Phase 4: Company Settings System

- [ ] Normalize company profile, location, timezone, currency, and brand settings.
- [ ] Add settings save/preview behavior.
- [ ] Ensure settings propagate to scheduling, finance, inventory, and reports.
- [ ] Add audit events for critical settings changes.

Acceptance:

- Settings become real system configuration, not disconnected UI.

Verification:

- Changed currency/timezone affects dependent modules.

### Phase 5: Audit Logs And Activity Trail

- [ ] Define audit categories.
- [ ] Log critical user, permission, billing, integration, AI, and data changes.
- [ ] Add admin activity review UI.
- [ ] Add retention policy.

Acceptance:

- Important actions are traceable by tenant.

Verification:

- Tests or scripts confirm audit events for key mutations.

### Phase 6: Billing Readiness

- [ ] Define plans and feature gates.
- [ ] Add subscription/account status model.
- [ ] Add billing-safe feature checks.
- [ ] Add trial/disabled/suspended states.

Acceptance:

- The app can support paid pilots without manual database hacks.

Verification:

- Feature flags react to account status.

### Phase 7: Data Lifecycle And Retention

- [ ] Define deletion, archival, export, and restore behavior.
- [ ] Add company data export plan.
- [ ] Add soft-delete rules where needed.
- [ ] Define legal/compliance retention defaults.

Acceptance:

- Customer data has a lifecycle.

Verification:

- Export/retention paths are documented and testable.

### Phase 8: Support And Admin Tooling

- [ ] Add internal admin diagnostics.
- [ ] Add tenant repair tools with strict authorization.
- [ ] Add support-safe user impersonation decision.
- [ ] Add health/status indicators for tenant setup.

Acceptance:

- Support can fix issues without unsafe SQL edits.

Verification:

- Admin tools are service-protected and audited.

### Phase 9: Security Review Pass

- [ ] Review RLS, grants, storage, RPCs, and service routes.
- [ ] Add missing high-risk tests.
- [ ] Confirm anon exposure checks.
- [ ] Confirm secrets never leak to client.

Acceptance:

- SaaS security baseline is documented and enforced.

Verification:

- `npm run test:db:security` and deploy checks pass.

### Phase 10: SaaS Foundation Signoff

- [ ] Update master roadmap status.
- [ ] Update launch checklist.
- [ ] Freeze foundation decisions for v1.
- [ ] List remaining post-v1 SaaS enhancements.

Acceptance:

- Foundation is strong enough to build product differentiation on top.

Verification:

- A fresh tenant can be created, used, audited, and supported.

