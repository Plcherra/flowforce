# Flowforce Launch Billing Tasks

## Monetization Readiness Analysis
- **Packaging**: Finalize a three-tier structure (`Operations`, `Operations+`, `Enterprise`) with quantified limits (locations, seats, automation runs) and map every existing feature to a tier; create a downgrade posture that clearly delineates what is lost.
- **Value Metrics**: Anchor billing to active locations plus automation add-ons; ensure Supabase schemas capture plan, seat counts, overage counters, and trial expiry.
- **Compliance**: Confirm business verification and bank payout configuration in Stripe; review regional tax obligations (US sales tax, EU VAT, GST) and register with Stripe Tax if coverage is incomplete.
- **Revenue Operations**: Define quoting and discount approval matrix, align the CRM stage transitions with billing events, and script renewal/co-term flows for customer success.
- **Support & Finance Readiness**: Document refund, credit memo, and charge dispute playbooks; ensure accounting has a monthly close checklist for Stripe exports (`balance_transactions`, `payouts`).
- **Success Metrics**: Establish baseline metrics (trial→paid, logo churn, expansion MRR) and build a looker/dashboard spec so analytics can report post-launch impact.
- **Launch Gate**: All items above must be signed off in a go/no-go checklist maintained in `docs/ops/monetization-readiness.md` with ownership and status fields.

## Stripe Setup Workstream

### Task ID: B01 — Environment & Access
- **Category**: [SETUP]
- **Description**: Create dedicated Stripe accounts (Production, Test) under the Flowforce workspace, enforce 2FA, and enable role-based access (Developer, Analyst, Support) in the Stripe dashboard.
- **Deliverables**: Access matrix stored in `docs/security/stripe-access.md`; API keys and webhook secrets injected into Vercel/Supabase via secure secrets management.
- **Effort**: 6h

### Task ID: B02 — Product Catalog & Pricing
- **Category**: [CONFIG]
- **Description**: Model pricing as Stripe Products (one per plan) with recurring Prices (monthly/annual) and metered Prices for automation overages; encode add-ons (Learning Module, Advanced Analytics) as separate products for cross-sell flexibility.
- **Deliverables**: `scripts/stripe/sync-pricing.ts` idempotently seeds products/prices; configuration JSON checked into `supabase/stripe_catalog.json`.
- **Effort**: 8h

### Task ID: B03 — Checkout & Billing Flows
- **Category**: [IMPLEMENTATION]
- **Description**: Integrate Stripe Checkout for self-serve plans and Billing Portal for payment method management; for sales-assisted deals, implement the Stripe Invoicing API with hosted invoice pages.
- **Deliverables**: Next.js pages `src/pages/billing/checkout.tsx` and `src/pages/billing/portal.tsx`; server handlers in `src/pages/api/stripe/*` to create sessions with plan metadata and customer IDs.
- **Effort**: 12h

### Task ID: B04 — Webhooks & Subscription Sync
- **Category**: [BACKEND]
- **Description**: Stand up a resilient webhook listener (Supabase Edge Function or dedicated Vercel API route) handling `checkout.session.completed`, `invoice.paid/failed`, `customer.subscription.*`; persist normalized billing state in `supabase/functions/billing-sync.ts`.
- **Deliverables**: Database tables `billing_customers`, `subscriptions`, `subscription_items`, `usage_records` with RLS tied to company IDs; background job to reconcile billing state nightly.
- **Effort**: 14h

### Task ID: B05 — Tax, Invoicing & Compliance
- **Category**: [GOVERNANCE]
- **Description**: Enable Stripe Tax, configure location collection in checkout, and map tax data into exported invoices; implement PDF invoice storage in Supabase storage for accounting.
- **Deliverables**: `docs/billing/tax-policy.md`; automated tax location tests in `tests/billing/tax.spec.ts`.
- **Effort**: 10h

### Task ID: B06 — Dunning & Notifications
- **Category**: [CUSTOMER-SUCCESS]
- **Description**: Configure Stripe automatic retry schedule, integrate with Flowforce email service for failed payment notifications, and surface dunning status in the admin console.
- **Deliverables**: Notification templates in `supabase/functions/email/templates/billing`; UI banner in `src/components/billing/PaymentStatusBanner.tsx`.
- **Effort**: 6h

## Feature Gating Plan

### Task ID: F01 — Entitlement Model
- **Category**: [ARCHITECTURE]
- **Description**: Create a feature flag schema `feature_entitlements` keyed by `company_id`, `feature_key`, and plan; support overrides for trials or beta customers.
- **Deliverables**: DB migration in `supabase/migrations/2024XXXX_feature_entitlements.sql`; TypeScript types in `src/types/billing.ts`.
- **Effort**: 8h

### Task ID: F02 — Plan Resolver
- **Category**: [BACKEND]
- **Description**: Implement `getCompanyEntitlements(companyId)` service that merges plan defaults with overrides and caches results in Redis/Supabase KV for 5 minutes.
- **Deliverables**: Service in `src/server/billing/entitlements.ts`; unit coverage in `tests/billing/entitlements.test.ts`.
- **Effort**: 6h

### Task ID: F03 — Client Feature Guards
- **Category**: [FRONTEND]
- **Description**: Introduce a React hook `useFeatureGate(featureKey)` to read entitlements via context, with suspense-friendly loading states; gate high-value UI modules (Automation Builder, Advanced Analytics, Inventory Transfers) behind the hook.
- **Deliverables**: Hook in `src/hooks/billing/useFeatureGate.ts`; playbook documenting guard usage in `docs/engineering/feature-gates.md`.
- **Effort**: 8h

### Task ID: F04 — API Enforcement
- **Category**: [BACKEND]
- **Description**: Apply middleware on Supabase edge functions and REST endpoints to reject requests exceeding plan limits (e.g., automation runs per month) and emit structured errors for UI handling.
- **Deliverables**: Middleware in `supabase/functions/_shared/entitlementGuard.ts`; integration tests covering limit exhaustion.
- **Effort**: 10h

### Task ID: F05 — Plan & Usage UI
- **Category**: [FRONTEND]
- **Description**: Build a billing settings page that shows current plan, renewal date, usage consumption, and upgrade CTA; include downgrade warnings and proration estimates pulled from Stripe’s upcoming invoice API.
- **Deliverables**: Page at `src/pages/settings/billing.tsx`; chart components for usage in `src/components/billing/UsageMeter.tsx`.
- **Effort**: 12h

## Post-Launch Analytics Integration

### Task ID: A01 — Event Taxonomy
- **Category**: [DATA]
- **Description**: Define core monetization events (`Billing Checkout Viewed`, `Trial Converted`, `Payment Failed`, `Upgrade Requested`) with required properties (plan, MRR delta, seat count); store taxonomy in `docs/analytics/event-catalog.md`.
- **Effort**: 4h

### Task ID: A02 — Instrumentation
- **Category**: [FRONTEND/BACKEND]
- **Description**: Instrument client and server flows using Segment (or Supabase Functions) to emit taxonomy events; ensure webhooks trigger backend events for invoices and renewals.
- **Deliverables**: Wrapper utility `src/lib/analytics/track.ts`; automated tests in `tests/analytics/events.spec.ts`.
- **Effort**: 8h

### Task ID: A03 — Revenue Dashboards
- **Category**: [ANALYTICS]
- **Description**: Pipe Stripe events into the data warehouse (BigQuery/Supabase analytics schema) and build dashboards tracking ARR, churn, net expansion, dunning funnel, and plan mix.
- **Deliverables**: dbt models or Supabase SQL views in `supabase/analytics/*`; dashboard spec in `docs/analytics/monetization-dashboard.md`.
- **Effort**: 12h

### Task ID: A04 — Alerting & QA
- **Category**: [OPERATIONS]
- **Description**: Configure alerts for payment failures, webhook drift, and reporting job failures via PagerDuty/Slack; define weekly QA checklist comparing Stripe MRR to warehouse numbers.
- **Deliverables**: Alert runbooks in `docs/ops/billing-alerts.md`; monitoring configuration stored as Terraform or Stripe Radar settings.
- **Effort**: 6h

### Task ID: A05 — Feedback Loop
- **Category**: [CUSTOMER-SUCCESS]
- **Description**: Aggregate NPS, support tickets, and billing-related churn reasons into a monthly review with product and success leadership to prioritize monetization iterations.
- **Deliverables**: Template in `docs/ops/monetization-retro.md`; scheduled automation (Zapier/Cron) that drops metrics into a shared Slack channel.
- **Effort**: 4h

