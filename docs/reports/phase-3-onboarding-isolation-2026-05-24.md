# Phase 3 Onboarding and Tenant Isolation

Date: 2026-05-24

## Goal

Harden the account-creation baseline and stop production from hiding broken tenant linkage behind demo data.

## Implemented

- Added `supabase/migrations/20260524000400_phase3_onboarding_idempotence.sql`.
- Replaced `public.create_company_with_setup` with an idempotent `security definer` RPC.
- The RPC now reuses an existing owner company from `profiles.company_id` or `company_members.company_id`.
- The RPC repairs/creates owner membership, owner profile, system settings, default roles, and an audit event.
- Authenticated callers can only create setup for their own `auth.uid()`; service role remains available for server-side administrative flows.
- Added `supabase/tests/phase3_tenant_isolation.test.sql`.
- Added `npm run test:db:security`.
- Disabled production placeholder profile fallback in `src/contexts/ProfileContext.tsx`.
- Disabled production demo company fallback in `src/hooks/useCompany.tsx`.
- Aligned two stale TypeScript enum assumptions with the actual text-column schema.

## Validation

Commands run successfully:

```sh
env -u DOCKER_HOST npx supabase db reset
env -u DOCKER_HOST npm run test:db:security
env -u DOCKER_HOST npx supabase db push --dry-run
env -u DOCKER_HOST npx supabase db push --yes
env -u DOCKER_HOST npx supabase gen types typescript --linked
npm run check:supabase
npm run typecheck:supabase
npm run typecheck:app
env -u DOCKER_HOST npx supabase db push --dry-run
git diff --check
node --check scripts/check-supabase-contract.mjs
```

Remote migration status after push:

```text
Remote database is up to date.
```

Security test coverage:

- Tenant A owner sees only Tenant A company data.
- Tenant A owner cannot see Tenant B company.
- Tenant A owner cannot assert membership in Tenant B.
- Tenant A staff user cannot update the company row.
- Setup RPC creates a company for the authenticated owner.
- Setup RPC retry returns the existing company id.
- Setup RPC retry keeps one membership row.
- Setup RPC creates system settings and default roles.
- Setup RPC blocks an authenticated user from creating setup for another owner id.

## Remaining Work

- Route the production onboarding API path through `create_company_with_setup` so the app has one canonical setup transaction.
- Add browser/API onboarding E2E that proves signup creates exactly one company, profile, membership, settings row, and default role baseline.
- Replace the production missing-profile/company state with a polished repair/setup-required screen.
- Expand two-tenant tests to tasks, messages, calendar, scheduling, forms, inventory/finance, analytics, and storage paths.
- Split the old restore migration into reviewed domain migrations.
