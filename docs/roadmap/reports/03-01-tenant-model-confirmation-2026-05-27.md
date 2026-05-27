# 03.01 Tenant Model Confirmation

Date: 2026-05-27

## Completed

- Confirmed `company_members` as the long-term tenant membership source.
- Confirmed `profiles.company_id` as a current-company/default-company shortcut only.
- Added a migration that updates tenant helper functions to derive access and admin status from `company_members`.
- Added tenant isolation tests proving `profiles.company_id` and profile admin flags alone do not grant tenant access.
- Documented multi-company behavior and tenant ownership rules for future tables.

## Files Added

- `supabase/migrations/20260527000100_confirm_company_members_tenant_source.sql`
- `docs/tenant-model.md`

## Files Updated

- `supabase/tests/phase3_tenant_isolation.test.sql`
- `docs/roadmap/03-core-saas-foundation.md`
- `docs/roadmap/00-master-roadmap.md`

## Tenant Rule

Tenant membership is granted only by `company_members`.

`profiles.company_id` may select or repair the current/default company, but it must not grant RLS membership or admin authority by itself.

## Verification

- Passed: `npm run typecheck`
- Passed: `npm run check:supabase`
- Blocked locally: `supabase test db --local supabase/tests/phase3_tenant_isolation.test.sql`

Local SQL test note:

- The tenant isolation test now encodes the rule, but this machine could not run it because the Docker daemon is not running.

## Next Phase

- 03.02 Onboarding Production Hardening
