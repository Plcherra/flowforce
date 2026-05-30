# Mobile Offline Critical Workflows

Date: 2026-05-30

## Scope

Phase 08.08 turns the offline queue foundation into actual field workflow protection for the highest-value mobile work:

- Inventory counts can be created while offline.
- Inventory count progress can be updated while offline.
- Inventory counts can be completed or submitted for review while offline.
- Form and checklist submissions can be saved while offline.
- Evidence-like payloads are stored as metadata until sync can safely upload or replay the final payload.

## Runtime Contract

The runtime contract lives in `src/services/mobile/mobileOfflineCriticalWorkflows.ts`.

It provides queue wrappers for:

- `queueOfflineInventoryCountCreate`
- `queueOfflineInventoryCountUpdate`
- `queueOfflineInventoryCountLineUpdate`
- `queueOfflineInventoryCountSubmit`
- `queueOfflineFormSubmission`

The inventory hooks now queue failed offline create/update/line-update/submit mutations instead of destroying field work. The forms hook queues failed offline form submissions and returns a local optimistic submission so the form flow can continue.

## Evidence Safety

Offline form evidence uses a metadata-only local-storage policy. `sanitizeOfflineEvidencePayload` recursively replaces `File` and `Blob` values with descriptors containing name, size, type, and modified time. Raw binary payloads are not persisted into `flowforce.mobile.offlineQueue.v1`.

This gives the mobile app a safe queue record for later sync while avoiding accidental local-storage persistence of large or sensitive binary content.

## Review Sync

Queued form submissions and inventory count submissions carry `reviewStatus: pending_review_sync`. Queued count edits carry `reviewStatus: pending_offline_sync`.

This keeps the user-facing workflow honest: the field user can continue, and the manager/review path knows the server-side review state is not final until the queue replays.

## Acceptance

- Offline inventory count create/update/line-update/submit paths enqueue mutations.
- Offline form submissions enqueue mutations.
- Evidence-like file/blob fields are reduced to metadata before local persistence.
- Queued review work is explicitly marked pending sync.
- `npm run check:mobile-offline-critical-workflows` passes.
