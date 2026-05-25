# Phase 10 Sensitive Storage Privacy

Date: 2026-05-24

## Summary

Phase 10 starts the private-bucket conversion for uploaded files that already have durable storage paths in application data.

## Implemented

- Added `supabase/migrations/20260524001300_phase10_sensitive_storage_privacy.sql`.
- Made these buckets private:
  - `message-attachments`
  - `operations-reports`
- Narrowed the public storage read policy so those private buckets are no longer public-readable.
- Added `src/lib/signedStorageUrls.ts` for short-lived signed URL creation/opening.
- Updated message attachments to save storage paths instead of fresh public URLs.
- Updated message image previews to open through signed URLs when a storage path exists.
- Updated report original downloads to open through signed URLs.
- Fixed message attachment validation so `path` accepts Supabase object paths instead of incorrectly requiring a URL.
- Added `supabase/tests/phase10_sensitive_storage_privacy.test.sql`.
- Extended `npm run test:db:security` to include Phase 10.
- Updated `scripts/check-supabase-contract.mjs` to expect a mixed public/private bucket posture.

## Intentionally Deferred

These buckets still use public URLs in active UI/data models and should not be flipped private until values store durable object paths:

- `attachments`
- `company-updates-media`

`company-assets` remains public by product intent for logo/branding assets unless the product later requires private branding.

Phase 11 moved the form buckets out of this deferred list.

## Validation

- `npm run typecheck` passed.
- `env -u DOCKER_HOST npx supabase db reset` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed, including Phase 10.
- Local contract check against `http://127.0.0.1:54321` passed with 2 private and 8 public buckets.
- `env -u DOCKER_HOST npx supabase db push --yes` applied the Phase 10 migration remotely.
- `env -u DOCKER_HOST npx supabase db push --dry-run` reports the remote database is up to date.
- `env -u DOCKER_HOST npm run check:supabase` passed against the configured Supabase environment.
