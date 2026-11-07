# Billing Readiness

Date: 2026-07-02

## Scope

FlowForce v1 billing connects Stripe Checkout, webhooks, and the Customer Portal to the tenant billing model (`trial | active | deactivated`) and canonical plans (`starter | growth | enterprise`).

## Source Of Truth

Primary product billing state lives in `system_settings.admin_config.tenantManagement`.

Stripe lookup columns are mirrored on `public.companies`:

- `stripe_customer_id`
- `stripe_subscription_id`
- `trial_ends_at`
- `current_period_ends_at`
- `cancel_at`

Tenant billing fields in `tenantManagement`:

- `plan`: `starter`, `growth`, or `enterprise`.
- `billingStatus`: `trial`, `active`, or `deactivated`.
- `billingEmail`: billing contact for the workspace.
- `trialEndsAt`: trial deadline.
- `currentPeriodEndsAt`: current billing period deadline.
- `cancelAt`: scheduled cancellation date when applicable.
- `stripeCustomerId` and `stripeSubscriptionId`: Stripe linkage.
- `paymentFailedAt`: first recorded invoice payment failure (grace period anchor).
- `activeSeats` and `maxSeats`: seat usage and limit.

Webhook idempotency is stored in `public.stripe_webhook_events`.

## Plans

The canonical plan contract lives in [billingPlans.ts](/src/services/billing/billingPlans.ts).

Stripe price IDs are configured with:

- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_GROWTH`
- `STRIPE_PRICE_ENTERPRISE`

Server-side mapping lives in [stripePrices.ts](/src/server/billing/stripePrices.ts).

## Packs

Team, Insights, and Stock are add-on packs. Operations is the base and stays on. Packs are not the Starter, Growth, or Enterprise plans. Commercial terms are not decided yet, so the pack page keeps the placeholders **Price TBD** and **Placeholder — awaiting pricing**.

Open packs from the **+** button next to OPS in the bottom nav (desktop and mobile). That menu lists what each pack unlocks. Opening one pack shows a page with a buy button only when its price env var is set. A missing price shows **Pricing coming soon** and does not call Stripe.

When a recurring Stripe **test** price exists, `POST /api/packs/checkout` creates a Checkout Session in `subscription` mode with quantity 1. The price's own interval is monthly or yearly. Pack checkout refuses live secret keys (`sk_live_` / `rk_live_`). Use a test key (`sk_test_` or `rk_test_`) only.

Expected server env vars (test price ids):

- `STRIPE_PRICE_PACK_TEAM`
- `STRIPE_PRICE_PACK_INSIGHTS`
- `STRIPE_PRICE_PACK_STOCK`

Routes:

- `GET /api/packs/offers` — booleans only, no price ids
- `POST /api/packs/checkout` with `{ pack: "team" | "insights" | "stock" }`
- `POST /api/packs/confirm` with `{ pack, sessionId }` after Stripe marks the session paid
- `POST /api/packs/portal` with `{ pack }` — Stripe Customer Portal to manage or cancel that company's pack subscription

Checkout and portal use the same owner, admin, or company admin check as plan checkout, and they honor a `billing.manage` deny override. A missing price returns `409` with `code: "pack_price_pending"`.

Webhook `POST /api/stripe/webhooks` (signature `STRIPE_WEBHOOK_SECRET`):

- `checkout.session.completed` and `checkout.session.async_payment_succeeded` turn that pack's flag on in `system_settings.admin_config.packFlags` only when `payment_status` is `paid` or `no_payment_required`.
- `customer.subscription.deleted`, and a subscription whose status is `canceled`, `unpaid`, or `incomplete_expired`, turn that pack's flag off.
- A subscription that is still `active` or `trialing`, including one set to cancel at period end, leaves the flag on.
- Pack events do not change the workspace Starter, Growth, or Enterprise plan.

Still waiting on Pedro:

1. Price for Team, Insights, and Stock?
2. Monthly or yearly?
3. Per seat or per company?
4. À la carte or only as bundles?
5. Add-on to Starter, Growth, and Enterprise, or a replacement of that model?

## Stripe Flows

### Checkout

- Route: `POST /api/stripe/create-checkout-session`
- Auth: bearer session + owner/admin/company_admin role
- Body: `{ plan: "starter" | "growth" | "enterprise", intent?: "upgrade" | "reactivate" }`
- UI entry points: `/pricing`, Settings → Billing

### Customer Portal

- Route: `POST /api/stripe/create-portal-session`
- Auth: same as checkout
- Shown when workspace billing status resolves to `active`

### Webhooks

- Route: `POST /api/stripe/webhooks`
- Auth: Stripe signature (`STRIPE_WEBHOOK_SECRET`)
- Handled events:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Updates tenant billing fields, company Stripe columns, and audit log entries

### Payment failure grace period

When `invoice.payment_failed` fires:

- `tenantManagement.paymentFailedAt` is recorded on first failure
- Workspace stays `active` for `BILLING_PAYMENT_GRACE_DAYS` (default **7**)
- After grace expires, status resolves to `deactivated`
- Successful payment (`subscription.status=active`) clears `paymentFailedAt`

Configure grace window:

```bash
BILLING_PAYMENT_GRACE_DAYS=7
```

### Trial to paid transition

When checkout completes or a subscription becomes `active` (non-trialing):

- `trialEndsAt` is cleared (`null`) on both `tenantManagement` and `companies.trial_ends_at`
- Prevents the trial expiry cron from downgrading a paying workspace

### Production webhooks

Register a live webhook endpoint in Stripe Dashboard:

```text
https://your-production-domain.com/api/stripe/webhooks
```

Recommended events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Production checklist:

1. Create a **live mode** webhook endpoint pointing at your production domain (VPS, Vercel, or reverse-proxy host).
2. Copy the signing secret into deploy secrets as `STRIPE_WEBHOOK_SECRET`.
3. Use live `STRIPE_SECRET_KEY` and live price IDs in production env.
4. Confirm Stripe Dashboard → Developers → Webhooks shows successful deliveries after a test checkout.
5. Do **not** rely on `stripe listen` in production; that is local development only.

If you use a reverse proxy (nginx/Caddy), forward `POST /api/stripe/webhooks` with the raw request body unchanged so signature verification succeeds.

### Rate limiting

Checkout and portal routes apply per-user rate limits:

- 20 requests per 15 minutes per authenticated billing admin
- Returns HTTP 429 with a user-facing retry message

### User-facing billing errors

Client checkout/portal calls map API and network failures to plain-language messages (session expired, card declined, rate limited, portal unavailable).

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

## Environment

Required for live Stripe billing:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

## Local Testing

1. Apply migrations locally: `supabase db reset` or run `20260702000200_phase2_stripe_billing_integration.sql`. // pragma: allowlist secret
2. Create three recurring prices in Stripe test mode and copy their IDs into env.
3. Start the app and Stripe CLI forwarding:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

4. Sign in as an owner/admin, open `/pricing` or Settings → Billing, and complete checkout with test card `4242 4242 4242 4242`.
5. Confirm webhook updates `billingStatus` to `active`, plan/seat limits sync, and audit log entries are written.

## Verification

Run:

```bash
npm run check:billing
npm run typecheck:src
```

## Migrations

1. `supabase/migrations/20260702000100_phase1_billing_status_simplification.sql` // pragma: allowlist secret
2. `supabase/migrations/20260702000200_phase2_stripe_billing_integration.sql` // pragma: allowlist secret

Back up `system_settings` and `companies` before running in production.

Verify Phase 1 with `supabase/scripts/verify-billing-status-migration.sql` in the SQL Editor. // pragma: allowlist secret
