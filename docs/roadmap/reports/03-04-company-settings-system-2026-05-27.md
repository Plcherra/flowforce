# 03.04 Company Settings System

Date: 2026-05-27

## Summary

Phase 03.04 makes company settings real product configuration instead of disconnected form state.

## Completed

- Documented the company settings source-of-truth model.
- Kept `companies` as the operational source for profile, brand, timezone, currency, and working-hours values.
- Kept `system_settings` as the grouped settings snapshot for the settings UI.
- Added brand color edit and preview controls to the company profile settings panel.
- Propagated profile and brand saves to `companies` and `system_settings`.
- Propagated localization saves to `companies.timezone`, `companies.currency`, and `system_settings.localization`.
- Added `system_settings.updated` audit events for settings saves.
- Updated analytics report currency rendering to use company-level currency via `useCurrency()`.
- Added `npm run check:settings` to guard the settings propagation contract.

## Verification

- `npm run check:settings`
- `npm run typecheck:src`

## Notes

- Scheduling and inventory already have several company-aware hooks; later product-completion phases should continue replacing hard-coded fallback timezone/currency values at the component level.
- The next phase should build on the audit event now emitted by settings changes.
