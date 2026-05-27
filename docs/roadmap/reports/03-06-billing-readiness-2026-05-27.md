# 03.06 Billing Readiness

Date: 2026-05-27

## Summary

Phase 03.06 adds a tenant-level billing readiness layer for paid pilots: canonical plans, account statuses, feature gates, admin controls, and contract checks.

## Completed

- Defined canonical `starter`, `growth`, and `enterprise` plan contracts.
- Added tenant billing fields for account status, subscription status, billing email, trial end, and current period end.
- Normalized tenant billing settings through the admin settings normalizer.
- Added admin settings controls for plan, account status, subscription status, billing contact, trial dates, billing period dates, and seat limits.
- Wired `useFeatureFlags()` to read tenant billing state from `system_settings.admin_config.tenantManagement`.
- Added billing-safe feature gates for `trialing`, `active`, `past_due`, `suspended`, and `disabled` accounts.
- Preserved audit log visibility for suspended and disabled accounts.
- Documented the billing readiness contract in `docs/billing-readiness.md`.
- Added `npm run check:billing` to guard the billing readiness contract.

## Verification

- `npm run check:billing`
- `npm run typecheck:src`
- `npm run build`

## Notes

- This phase intentionally does not integrate Stripe or charge customers.
- Billing state currently lives in `system_settings.admin_config.tenantManagement`; a later payments phase can map Stripe subscription events into this model.
- No Supabase migration is required for this phase because it extends the existing settings JSON contract.
