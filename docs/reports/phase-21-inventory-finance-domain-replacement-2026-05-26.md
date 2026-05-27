# Phase 21 - Inventory And Finance Domain Replacement

Date: 2026-05-26

## Goal

Continue replacing the legacy restore migration with reviewed forward contracts for inventory, finance, procurement, stock counts, production, purchasing, and waste records.

## Completed

- Added `supabase/migrations/20260526000200_phase21_inventory_finance_domain_replacement.sql`.
- Added required `company_id` ownership to restore-era finance/procurement and inventory child tables that previously relied on generic containment or indirect references:
  - `payment_approvals`
  - `purchase_orders`
  - `purchase_order_items`
  - `inv_adjustments`
  - `inv_count_lines`
  - `inv_counts`
  - `inv_item_units`
  - `inv_par_overrides`
  - `inv_par_profiles`
  - `inv_prep_batches`
  - `inv_purchase_lines`
  - `inv_recipes`
  - `inv_stock_lots`
  - `inv_waste`
- Converted relationship columns from free-text UUIDs to real UUID columns where safe, including payment approvals, purchase-order items, legacy inventory transactions, stock counts, recipes, purchases, lots, and waste links.
- Added company-id inheritance triggers for finance/procurement and inventory rows that can derive tenant ownership from users, payments, purchase orders, items, locations, suppliers, counts, purchases, and production events.
- Added a reusable relationship guard, `public.inventory_finance_row_matches_company`, so RLS write checks reject cross-tenant parent/child combinations even when a client submits its own `company_id`.
- Added required company checks, company foreign keys, relationship foreign keys, and indexes across the reviewed inventory/finance domain.
- Replaced restore-era generic policies with explicit tenant policies for:
  - `expenses`
  - `payments`
  - `payment_approvals`
  - `purchase_orders`
  - `purchase_order_items`
  - `inventory_categories`
  - `inventory_items`
  - `inventory_transactions`
  - `inv_adjustments`
  - `inv_count_events`
  - `inv_count_lines`
  - `inv_count_locations`
  - `inv_count_scans`
  - `inv_counts`
  - `inv_items`
  - `inv_item_units`
  - `inv_locations`
  - `inv_par_overrides`
  - `inv_par_profiles`
  - `inv_prep_batches`
  - `inv_prep_plans`
  - `inv_production_approvals`
  - `inv_production_events`
  - `inv_production_materials`
  - `inv_purchase_lines`
  - `inv_purchases`
  - `inv_recipes`
  - `inv_stock_lots`
  - `inv_suppliers`
  - `inv_transfer_audit`
  - `inv_transfer_items`
  - `inv_transfers`
  - `inv_waste`
- Kept `inv_units` as an authenticated global read table with anon access revoked.
- Added `supabase/tests/phase21_inventory_finance_domain_contracts.test.sql` covering two-tenant visibility, trigger-based company inheritance, cross-tenant relationship rejection, required company IDs, UUID relationship types, and explicit policy presence.
- Added the Phase 21 pgTAP suite to `npm run test:db:security`.
- Tightened `scripts/check-supabase-contract.mjs` so deploy checks now monitor 34 inventory/finance relations, anon denial for sensitive inventory/finance tables, and RLS coverage for the reviewed domain.

## Verification

- `env -u DOCKER_HOST supabase db reset` passed.
- `env -u DOCKER_HOST supabase test db --local supabase/tests/phase21_inventory_finance_domain_contracts.test.sql` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed.
- Local Supabase contract check passed against the reset local stack:
  - 0 missing relations
  - 0 relation errors
  - 0 missing RPCs
  - 0 anon exposures
  - 0 security contract errors
- `supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --dry-run` reported only the Phase 21 migration pending.
- `supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --yes` applied the Phase 21 migration remotely.
- `env -u DOCKER_HOST npm run check:deploy` passed against the linked remote project:
  - 27 local migrations and 27 remote migrations matched
  - 34 inventory/finance relations checked
  - 89 anon exposure checks blocked
  - 119 RLS tables checked
  - 0 remote schema/security contract errors

## Remaining Work

- Continue restore replacement by domain:
  - learning/recognition/gamification
  - analytics/operations/copilot
- Once all domains own explicit constraints, grants, and policies, retire the old restore migration as a historical stabilization artifact.
