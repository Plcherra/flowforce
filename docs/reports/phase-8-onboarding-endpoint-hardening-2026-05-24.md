# Phase 8 Onboarding Endpoint Hardening

Date: 2026-05-24

## Scope

Phase 8 routes the production onboarding completion API through the canonical idempotent setup RPC and adds an API-level onboarding E2E guard.

## Implemented

- Updated `app/api/onboarding/complete/route.ts` to call `public.create_company_with_setup` instead of manually inserting/updating companies, profiles, memberships, and settings.
- Added `supabase/migrations/20260524001000_phase8_onboarding_rpc_payload_repair.sql`.
  - Retries now repair company fields from the latest onboarding payload.
  - Owner profile first name, last name, email, and phone are repaired by the RPC.
- Added `supabase/migrations/20260524001100_phase8_onboarding_identifier_type_alignment.sql`.
  - Aligns remote drift where `companies.template_id` and `positions.role_id` could still be UUID columns even though app template identifiers are strings.
- Added `supabase/migrations/20260524001200_phase8_system_logs_contract.sql`.
  - Aligns `system_logs` with the server logger so API failures can persist diagnostics.
- Added `scripts/e2e-onboarding-complete.mjs`.
  - Creates a fresh auth user.
  - Calls `/api/onboarding/complete`.
  - Verifies company, profile, company membership, system settings, and role baseline.
  - Retries onboarding and verifies the same company id is reused.
  - Cleans up the generated tenant and auth user.
- Added `npm run test:e2e:onboarding`.
- Expanded Phase 3 pgTAP coverage from 17 to 19 checks for retry payload repair.

## Validation

- `env -u DOCKER_HOST npx supabase migration up --local` passed.
- `env -u DOCKER_HOST npx supabase db push` applied Phase 8 migrations remotely.
- `ONBOARDING_E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e:onboarding` passed against a local Next server and the linked Supabase project.
- `npm run typecheck` passed.
- `env -u DOCKER_HOST npm run check:supabase` passed against remote:
  - 61 RLS tables
  - 10 storage buckets
  - 6 storage policies
  - 0 anonymous exposures
- `env -u DOCKER_HOST npx supabase db push --dry-run` reports remote is up to date.
- `env -u DOCKER_HOST npx supabase db reset` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed across Phase 3 through Phase 7.

## Remaining Risk

The onboarding endpoint is now canonical and idempotent, but it still accepts the completion payload by verified user id/email rather than requiring an authenticated bearer session. That keeps the current email-confirmation-tolerant signup flow working, but a later auth-hardening pass should decide whether to require a session, a short-lived setup token, or a server-created onboarding nonce.

The next shipment item is the missing tenant repair/setup-required screen.
