# Billing Readiness

Date: 2026-07-02

## Scope

This is the v1 paid-pilot readiness layer. It does not connect Stripe or process payments yet. It gives FlowForce a tenant-level billing model, canonical plans, billing statuses, and product feature gates so a pilot tenant can be enabled or deactivated without manual database hacks.

## Source Of Truth

Billing readiness is stored in `system_settings.admin_config.tenantManagement`.

The tenant billing fields are:

- `plan`: `starter`, `growth`, or `enterprise`.
- `billingStatus`: `trial`, `active`, or `deactivated`.
- `billingEmail`: billing contact for the workspace.
- `trialEndsAt`: trial deadline.
- `currentPeriodEndsAt`: current billing period deadline.
- `activeSeats` and `maxSeats`: seat usage and limit.

Legacy fields `accountStatus` and `subscriptionStatus` were removed in Phase 1. Existing rows are migrated to `billingStatus`.

## Plans

The canonical plan contract lives in [billingPlans.ts](/src/services/billing/billingPlans.ts).

- `starter`: small pilot workspace with core prep, waste, shift swapping, and data export.
- `growth`: multi-manager workspace with purchasing, custom reports, engagement metrics, and OODA visibility.
- `enterprise`: advanced workspace with larger seat capacity, advanced inventory, reports, AI scheduling, and integration gates.

## Billing Status Behavior

Feature flags are resolved through `useFeatureFlags()` and then adjusted by `applyBillingToFeatureFlags()`.

- `trial`: uses the selected plan unless the trial date is expired, in which case the workspace resolves to `deactivated`.
- `active`: uses the selected plan.
- `deactivated`: hard downgrade to minimal access. Audit logs stay enabled for support review.

Owners see status in **Settings → Billing**. Internal admins can override status in **Settings → Admin → Tenant management**.

## Trial Expiry

Runtime feature gates use `resolveBillingStatus()`, which treats expired trials as `deactivated` even before persistence runs.

A daily cron persists expired trials:

- Route: `GET|POST /api/cron/billing-trial-expiry`
- Auth: same cron secret as other `/api/cron/*` routes
- Action: sets `billingStatus` to `deactivated` and writes `billing.trial_expired` audit events

Schedule it in your deployment platform (for example once daily at 03:00 UTC).

Monitor cron health: failed runs log to the app logger with scope `cron-billing-trial-expiry`. Alert if the endpoint returns non-200 for multiple consecutive days.

## Admin Controls

Tenant billing settings are editable in the admin settings panel. Saving those settings goes through the existing system settings save path and is covered by the `system_settings.updated` audit event.

## Verification

Run:

```bash
npm run check:billing
```

This confirms the canonical plan/status contract, tenant settings model, normalizer, billing UI, and feature flag gate are all present.

The phase-level release checks also include this contract through `npm run check:local` and `npm run check:release`.

## Migration

Apply `supabase/migrations/20260702000100_phase1_billing_status_simplification.sql` to map legacy statuses:

- `trialing` / `trial` → `trial`
- `active` → `active`
- everything else (`past_due`, `suspended`, `disabled`, legacy subscription states) → `deactivated`

Back up `system_settings` before running in production.

Verify with `supabase/scripts/verify-billing-status-migration.sql` in the SQL Editor.
