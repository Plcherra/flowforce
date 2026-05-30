# Mobile Offline Queue Foundation

Date: 2026-05-30
Roadmap phase: 08.07 Offline Queue Foundation

## Goal

FlowForce mobile needs a reliable way to preserve field work when connectivity drops. Phase 08.07 adds the first shared offline queue contract for the mobile app shell so tasks, forms, and inventory counts can save work locally before domain-specific sync executors are expanded.

## Offline-Capable Entities

The v1 offline queue starts with:

- Tasks: create, update, and complete.
- Forms: create draft, update answers, and submit.
- Inventory Counts: create count, update lines, and submit.

These are the highest-risk field workflows because they happen during live shifts and should not lose work when the device moves through weak network areas.

## Queue Contract

Each queued mutation stores:

- Tenant and user ownership.
- Entity, operation, source route, and payload.
- Optimistic key for temporary UI state.
- Client and server version fields for conflict detection.
- Status: `pending`, `syncing`, `synced`, `failed`, or `conflict`.
- Retry count, retry limit, and next retry timestamp.

The queue is persisted under `flowforce.mobile.offlineQueue.v1` so app reloads and Capacitor shell resumes preserve pending work.

## Retry And Conflict Policy

- Retry uses exponential backoff through `getMobileOfflineRetryDelayMs`.
- Failed mutations can be moved back to `pending`.
- Conflicting form and count work uses manual review because overwriting field evidence would be dangerous.
- Task updates use client replay because simple task status/title changes are lower risk.
- Synced items can be pruned after the server confirms success.

## App-Shell UI

`MobileOfflineQueueStatus` appears only on mobile viewports. It shows:

- Offline mode when the browser/native webview reports no network.
- Pending queue count.
- Failed-sync count.
- Conflict count.
- Retry action for failed/conflicting work.
- Open action back to the source workflow route.

## Integration Boundary

This phase creates the shared envelope and visible queue state. Domain repositories still need to opt in by wrapping task/form/count mutations with `enqueueMobileOfflineMutation(...)` and later calling synced/failed/conflict markers from their sync executors.

## Verification

08.07 is complete when:

- `npm run check:mobile-offline-queue` passes.
- `npm run check:local` passes.
- Mobile app shell renders `data-mobile-offline-queue`.
- The queue contract covers tasks, forms, and inventory counts.
