# Phase 12 Remaining Storage Privacy

Date: 2026-05-24

## Summary

Phase 12 finishes the active storage privacy pass. Company update media and employee-report attachments now use path-backed signed URL access, and all storage buckets except company branding assets are private.

## Implemented

- Added `supabase/migrations/20260524001500_phase12_remaining_storage_privacy.sql`.
- Added `public.employee_report.attachment jsonb` for structured attachment metadata.
- Updated employee report attachments to save `{ bucket, path, name/type/size }` instead of appending public URLs to notes.
- Updated employee report attachment rendering to open short-lived signed URLs.
- Updated company update media uploads to stop saving fresh public URLs.
- Updated company update image, video, and file previews to use signed URLs.
- Made these buckets private:
  - `company-updates-media`
  - `attachments`
- Updated `scripts/check-supabase-contract.mjs` to expect 9 private buckets and 1 public bucket.
- Added `supabase/tests/phase12_remaining_storage_privacy.test.sql`.
- Extended `npm run test:db:security` to include Phase 12.
- Updated generated Supabase types for `employee_report.attachment`.

## Public Bucket

Only `company-assets` remains public by product intent for branding/logo assets.

## Validation

- `npm run typecheck` passed.
- `env -u DOCKER_HOST npx supabase db reset` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed, including Phase 12.
- Local contract check against `http://127.0.0.1:54321` passed with 9 private and 1 public bucket.
- `env -u DOCKER_HOST npx supabase db push --yes` applied the Phase 12 migration remotely.
- `env -u DOCKER_HOST npx supabase db push --dry-run` reports the remote database is up to date.
- `env -u DOCKER_HOST npm run check:supabase` passed against the configured Supabase environment with 9 private and 1 public bucket.
- Browser smoke against `http://127.0.0.1:3000` loaded the app shell. The local browser session still has an incomplete-profile test user, so the app correctly stopped at the setup/profile error boundary instead of entering tenant data.

## Remaining Risk

Historical rows may still contain old public URL strings in free-text fields from before this phase. The buckets are private now, so those links will not grant public access, but old free-text URLs should be cleaned up or migrated when domain cleanup reaches employee reports and company updates.
