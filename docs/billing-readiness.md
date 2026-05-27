# Billing Readiness

Date: 2026-05-27

## Scope

This is the v1 paid-pilot readiness layer. It does not connect Stripe or process payments yet. It gives FlowForce a tenant-level billing model, canonical plans, account statuses, and product feature gates so a pilot tenant can be enabled, restricted, suspended, or disabled without manual database hacks.

## Source Of Truth

Billing readiness is stored in `system_settings.admin_config.tenantManagement`.

The tenant billing fields are:

- `plan`: `starter`, `growth`, or `enterprise`.
- `accountStatus`: `trialing`, `active`, `past_due`, `suspended`, or `disabled`.
- `subscriptionStatus`: `none`, `trialing`, `active`, `past_due`, `canceled`, or `unpaid`.
- `billingEmail`: billing contact for the workspace.
- `trialEndsAt`: trial deadline.
- `currentPeriodEndsAt`: current billing period deadline.
- `activeSeats` and `maxSeats`: seat usage and limit.

## Plans

The canonical plan contract lives in [billingPlans.ts](/Users/pedromartins/Documents/flowforce/src/services/billing/billingPlans.ts).

- `starter`: small pilot workspace with core prep, waste, shift swapping, and data export.
- `growth`: multi-manager workspace with purchasing, custom reports, engagement metrics, and OODA visibility.
- `enterprise`: advanced workspace with larger seat capacity, advanced inventory, reports, AI scheduling, and integration gates.

## Account Status Behavior

Feature flags are resolved through `useFeatureFlags()` and then adjusted by `applyBillingToFeatureFlags()`.

- `trialing`: uses the selected plan, unless the trial date is expired.
- `active`: uses the selected plan.
- `past_due`: keeps core access but disables advanced paid surfaces such as purchase orders, advanced inventory reporting, AI scheduling, automated reports, and external workforce sync.
- `suspended`: disables operational write-heavy product areas while preserving audit visibility.
- `disabled`: uses the same restrictive gate as suspended.

Admin audit logs stay enabled in every status so support and tenant owners can still inspect important activity.

## Admin Controls

Tenant billing settings are editable in the admin settings panel. Saving those settings goes through the existing system settings save path and is covered by the `system_settings.updated` audit event.

## Verification

Run:

```bash
npm run check:billing
```

This confirms the canonical plan/status contract, tenant settings model, normalizer, admin UI, and feature flag gate are all present.

The phase-level release checks also include this contract through `npm run check:local` and `npm run check:release`.
