# Phase 7 Storage Path Hardening

Date: 2026-05-24

## Scope

Phase 7 closes the storage isolation gap left after the initial bucket source-control work. The previous state had public-read buckets and broad authenticated write policies for form/report storage, plus message paths scoped only by user id.

## Implemented

- Added `supabase/migrations/20260524000800_phase7_storage_path_hardening.sql`.
- Added `supabase/migrations/20260524000900_phase7_company_updates_media_bucket_mime.sql` to keep the company update media bucket compatible with generic attachments.
- Added `company-updates-media` as a source-controlled bucket.
- Added `public.storage_object_company_id(object_name text)` to safely extract the first path segment as a company UUID.
- Replaced broad authenticated storage writes with company-membership policies for:
  - `company-assets`
  - form buckets: `form-audio`, `form-images`, `form-signatures`, `form-uploads`, `form-videos`
  - `message-attachments`
  - report buckets: `operations-reports`, `attachments`
  - `company-updates-media`
- Updated client upload paths to use `companyId/...` prefixes for:
  - message attachments
  - form image/file/audio/signature/video uploads
  - employee report inbox attachments
  - company update media
- Added `src/lib/storagePaths.ts` for shared path building and filename sanitization.
- Added `supabase/tests/phase7_storage_path_isolation.test.sql`.
- Extended `npm run test:db:security` to run Phase 7 storage isolation tests.
- Updated `scripts/check-supabase-contract.mjs` to require 10 buckets and the new storage policy names.
- Regenerated Supabase TypeScript types from the linked remote schema.

## Validation

- `env -u DOCKER_HOST npx supabase migration up --local` passed.
- `env -u DOCKER_HOST npx supabase test db --local supabase/tests/phase7_storage_path_isolation.test.sql` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed across Phase 3 through Phase 7.
- `npm run typecheck` passed.
- `env -u DOCKER_HOST npx supabase db reset` passed from a fresh local rebuild.
- `env -u DOCKER_HOST npx supabase db push` applied both Phase 7 migrations to the remote database.
- `env -u DOCKER_HOST npm run check:supabase` passed against remote:
  - 61 RLS tables
  - 10 storage buckets
  - 6 storage policies
  - 0 anonymous exposures
- `env -u DOCKER_HOST npx supabase db push --dry-run` reports the remote database is up to date.

## Remaining Risk

Buckets remain public-read because the active product code still uses public URLs for uploaded files. Writes are now company-scoped, but privacy for sensitive objects still requires a later signed URL/private bucket pass.

The next phase should focus on onboarding E2E, then the missing tenant repair/setup-required screen.
