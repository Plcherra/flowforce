# Onboarding Production Hardening

Last updated: 2026-05-27

This document defines the production onboarding baseline for new FlowForce tenants.

## Required Tenant Baseline

A completed owner onboarding must create or repair:

- `companies` row with `registration_complete = true` and `owner_id` set to the signup user.
- `profiles` row for the owner with `company_id`, `role = owner`, and `is_company_admin = true`.
- Exactly one owner `company_members` row for the company/user pair.
- Exactly one `system_settings` row for the company.
- At least the four default `company_roles` rows.
- At least one `audit_log` row with action `company.setup_verified`.

The API route verifies this baseline after calling `create_company_with_setup`.

## Recovery Behavior

The onboarding RPC remains idempotent and repair-oriented:

- If the company already exists through `profiles.company_id`, it repairs the same company.
- If membership already exists, it repairs the owner profile shortcut.
- Missing membership, settings, default roles, and setup audit events are recreated on retry.
- The route returns the same `companyId` on retry.

The production-like onboarding E2E intentionally deletes baseline rows after the first setup, then retries the onboarding API and verifies repair.

## Error Visibility

The onboarding completion and repair APIs return a `requestId` on success and failure.

Failure responses include a stage when useful:

- `create_company_with_setup`
- `verify_onboarding_setup`

Verification failures include missing baseline pieces and row counts so support can understand whether the issue is membership, settings, roles, audit, company, or profile related.

## Commands

Production-like onboarding smoke:

```bash
npm run test:e2e:onboarding
```

The app server must be running and the environment must include:

```bash
ONBOARDING_E2E_BASE_URL=http://127.0.0.1:3000
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Release Gates already runs this smoke after building and starting the production server.
