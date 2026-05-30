# Mobile Core Workflows

Date: 2026-05-30
Roadmap phase: 08.05 Mobile Core Workflows

## Goal

FlowForce mobile must let a field user do daily work without hunting through desktop-oriented navigation. Phase 08.05 defines the first production mobile workflow set and adds one-tap dashboard entry points for the highest-frequency actions.

## Pilot Workflows

The mobile v1 pilot workflows are:

- Dashboard: command center and daily action launcher at `/app/dashboard`.
- Schedule: shift and coverage review at `/app/enhanced-scheduling`.
- Tasks: assigned work, task detail, and task creation at `/app/tasks`.
- Messages: channel reading and team coordination at `/app/messages`.
- Forms: checklist/report discovery and fill flow at `/app/forms`.
- Inventory Counts: count list, start/resume, and count detail at `/app/inventory/counts`.
- Settings: profile, notifications, language, and support entry at `/app/settings`.

## UX Contract

- Staff workflows must have one-tap mobile entry from the dashboard daily action section.
- Manager quick actions must be defined for creating tasks, reviewing schedule/labor, and opening risk/report surfaces.
- Mobile touch targets remain covered by `scripts/smoke-visible-modules.mjs`.
- Forms and inventory counts are treated as field execution workflows, not admin-only screens.
- Settings on mobile is scoped around profile/notifications/language/support first, with heavier admin work remaining desktop-preferred.

## Current Implementation

- `src/services/mobile/mobileCoreWorkflows.ts` defines the workflow and quick-action contract.
- `src/features/dashboard/components/MobileCoreWorkflowActions.tsx` renders the mobile dashboard action launcher.
- `src/features/dashboard/pages/Dashboard.tsx` shows the launcher on mobile viewports.
- `docs/test-results/visible-modules-smoke.json` is the latest visible-module smoke baseline.

## Manual Mobile Checklist

Run this against the PWA and then against the synced Capacitor shell when `CAPACITOR_SERVER_URL` is reachable:

- Open Dashboard and confirm Daily actions appears on a phone viewport.
- Tap Schedule; verify the schedule route loads without horizontal overflow.
- Tap Tasks; verify task filters, task list, and create task are reachable.
- Tap Messages; verify channel navigation and send-message controls are reachable.
- Tap Forms; verify search, status tabs, and form fill entry are reachable.
- Tap Counts; verify inventory count list/start/resume entry is reachable.
- Tap Settings; verify mobile user settings are reachable.

## Verification

08.05 is complete when:

- `npm run check:mobile-core-workflows` passes.
- `npm run test:smoke` passes for production sidebar modules with zero errors/warnings.
- The dashboard exposes mobile daily actions for schedule, tasks, messages, forms, inventory counts, and settings.
