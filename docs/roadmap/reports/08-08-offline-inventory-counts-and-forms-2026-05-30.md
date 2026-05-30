# 08.08 Offline Inventory Counts And Forms

Date: 2026-05-30

## Outcome

Phase 08.08 connected the mobile offline queue to the two highest-value field workflows: inventory counts and forms/checklists.

## Delivered

- Added `src/services/mobile/mobileOfflineCriticalWorkflows.ts`.
- Inventory count create, update, line update, complete, and submit now queue offline mutations when a network/offline error occurs.
- Form submissions now queue offline mutations and return an optimistic local submission.
- Evidence-like `File` and `Blob` payload values are sanitized to metadata before queue persistence.
- Queued review workflows are marked `pending_review_sync` or `pending_offline_sync`.
- Added `docs/mobile-offline-critical-workflows.md`.
- Added `npm run check:mobile-offline-critical-workflows`.

## Verification

- `npm run check:mobile-offline-critical-workflows`
- `npm run typecheck:src`
- `npm run check:local`
- `npm run build`
- `git diff --check`

## Notes

No Supabase migration was needed. This phase uses the existing mobile queue foundation and client-side hooks to protect field work during weak connectivity.
