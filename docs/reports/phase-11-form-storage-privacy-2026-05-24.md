# Phase 11 Form Storage Privacy

Date: 2026-05-24

## Summary

Phase 11 moves form upload values away from public URL strings for new submissions and makes form storage buckets private.

## Implemented

- Added `src/lib/storageObjects.ts` for durable storage object references.
- Updated form uploads to save `{ bucket, path, name/type/size }` objects for new uploads:
  - file uploads
  - image uploads
  - video uploads
  - audio recordings/uploads
  - signatures
- Preserved compatibility with legacy public URL string values.
- Added signed URL rendering/opening for path-backed form media.
- Updated form review formatting so path-backed attachments display readable names instead of raw JSON.
- Added `supabase/migrations/20260524001400_phase11_form_storage_privacy.sql`.
- Made these buckets private:
  - `form-audio`
  - `form-images`
  - `form-signatures`
  - `form-uploads`
  - `form-videos`
- Added `supabase/tests/phase11_form_storage_privacy.test.sql`.
- Extended `npm run test:db:security` to include Phase 11.
- Updated `scripts/check-supabase-contract.mjs` to expect 7 private and 3 public buckets.

## Still Public

After Phase 12, only one bucket remains public by product intent:

- `company-assets`

Phase 12 converted company update media and employee-report attachments to signed URL access and made their buckets private.

## Validation

- `npm run typecheck` passed.
- `env -u DOCKER_HOST npx supabase db reset` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed, including Phase 11.
- Local contract check against `http://127.0.0.1:54321` passed with 7 private and 3 public buckets.
- `env -u DOCKER_HOST npx supabase db push --yes` applied the Phase 11 migration remotely.
- `env -u DOCKER_HOST npx supabase db push --dry-run` reports the remote database is up to date.
- `env -u DOCKER_HOST npm run check:supabase` passed against the configured Supabase environment with 7 private and 3 public buckets.
