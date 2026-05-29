# 05 Inventory Finance Cost Engine

## Goal

Build FlowForce's strongest differentiator: combine inventory, recipes, purchasing, waste, production, labor, scheduling, payroll, and expenses into one operational cost engine.

## Phases

### Phase 1: Canonical Cost Model

- [x] Define labor cost, inventory cost, purchasing cost, waste cost, production cost, and shift cost.
- [x] Define required tables/views/RPCs.
- [x] Define calculation precision and currency behavior.
- [x] Define tenant and permission rules.

Acceptance:

- Cost terms mean the same thing across modules.

Verification:

- Cost model doc maps to existing Supabase tables.

Status:

- Completed on 2026-05-28.
- Canonical model: [docs/cost-engine-canonical-model.md](../cost-engine-canonical-model.md)
- Contract: [src/services/costing/costEngineContract.json](../../src/services/costing/costEngineContract.json)
- Phase report: [05.01 Canonical Cost Model](./reports/05-01-canonical-cost-model-2026-05-28.md)

### Phase 2: Inventory Item And Unit Reliability

- [x] Verify items, categories, units, item units, locations, and suppliers.
- [x] Fix inconsistent unit conversion behavior.
- [x] Add validation for missing unit/cost/location data.
- [x] Add setup completeness indicators.

Acceptance:

- Inventory data can support calculations.

Verification:

- Item/unit tests and UI workflows pass.

Status:

- Completed on 2026-05-28.
- Reliability doc: [docs/inventory-item-unit-reliability.md](../inventory-item-unit-reliability.md)
- Phase report: [05.02 Inventory Item And Unit Reliability](./reports/05-02-inventory-item-unit-reliability-2026-05-28.md)

### Phase 3: Recipe And Production Costing

- [x] Connect recipe ingredients to item costs.
- [x] Calculate produced item cost.
- [x] Record production events and material usage.
- [x] Track yield and waste.

Acceptance:

- FlowForce can calculate cost of produced/prepped items.

Verification:

- Production event tests cover material deduction and tenant safety.

Status:

- Completed on 2026-05-28.
- Costing doc: [docs/recipe-production-costing.md](../recipe-production-costing.md)
- Phase report: [05.03 Recipe And Production Costing](./reports/05-03-recipe-production-costing-2026-05-28.md)

### Phase 4: Counts And Stock Position

- [x] Finish day-start/day-end count workflows.
- [x] Calculate expected versus counted stock.
- [x] Surface variance and missing counts.
- [x] Add supervisor review.

Acceptance:

- Managers can trust current stock levels.

Verification:

- Count workflows pass mobile viewport QA.

Status:

- Completed on 2026-05-28.
- Stock/count doc: [docs/counts-stock-position.md](../counts-stock-position.md)
- Phase report: [05.04 Counts And Stock Position](./reports/05-04-counts-stock-position-2026-05-28.md)

### Phase 5: Purchasing And Supplier Flow

- [x] Finish purchase orders and purchase lines.
- [x] Connect suppliers to items and costs.
- [x] Add received quantities and lot creation.
- [x] Add purchasing status and approval flow.

Acceptance:

- Purchasing updates inventory and cost basis.

Verification:

- Purchase receipt tests update stock/cost safely.

Status:

- Completed on 2026-05-28.
- Purchasing flow doc: [docs/purchasing-supplier-flow.md](../purchasing-supplier-flow.md)
- Phase report: [05.05 Purchasing And Supplier Flow](./reports/05-05-purchasing-supplier-flow-2026-05-28.md)

### Phase 6: Waste And Adjustment Intelligence

- [x] Finish waste events and inventory adjustments.
- [x] Classify waste by type, reason, item, location, and shift where possible.
- [x] Calculate cost impact.
- [x] Add trend and outlier views.

Acceptance:

- Waste becomes measurable and actionable.

Verification:

- Waste dashboard and tests show correct cost impact.

Status:

- Completed on 2026-05-28.
- Waste intelligence doc: [docs/waste-adjustment-intelligence.md](../waste-adjustment-intelligence.md)
- Phase report: [05.06 Waste And Adjustment Intelligence](./reports/05-06-waste-adjustment-intelligence-2026-05-28.md)

### Phase 7: Labor And Schedule Cost

- [x] Connect scheduled shifts to pay rates or labor estimates.
- [x] Calculate planned labor cost.
- [x] Calculate role/department/location labor breakdown.
- [x] Prepare actual labor import path.

Acceptance:

- Schedule can produce labor cost estimates.

Verification:

- Schedule cost view/RPC returns tenant-scoped results.

Status:

- Completed on 2026-05-28.
- Schedule labor cost doc: [docs/schedule-labor-cost.md](../schedule-labor-cost.md)
- Phase report: [05.07 Labor And Schedule Cost](./reports/05-07-labor-and-schedule-cost-2026-05-28.md)

### Phase 8: Unified Shift Profitability

- [x] Combine labor, inventory, production, waste, purchases, and expenses.
- [x] Add shift/day/location cost summaries.
- [x] Add upcoming shortage and overstaffing signals.
- [x] Add dashboard cards and reports.

Acceptance:

- FlowForce can answer "what will this shift cost and what should I prepare?"

Verification:

- Dashboard and report smoke pass with seeded cost data.

Status:

- Completed on 2026-05-28.
- Unified shift profitability doc: [docs/unified-shift-profitability.md](../unified-shift-profitability.md)
- Phase report: [05.08 Unified Shift Profitability](./reports/05-08-unified-shift-profitability-2026-05-28.md)

### Phase 9: Owner Financial Overview

- [x] Finish owner P&L-style overview.
- [x] Separate real data, estimated data, and imported data.
- [x] Add approvals for expenses/payments.
- [x] Add exportable summaries.

Acceptance:

- Owners can see operational cost without three separate apps.

Verification:

- No unlabeled demo financial data remains in production.

Status:

- Completed on 2026-05-28.
- Owner financial overview doc: [docs/owner-financial-overview.md](../owner-financial-overview.md)
- Phase report: [05.09 Owner Financial Overview](./reports/05-09-owner-financial-overview-2026-05-28.md)

### Phase 10: Cost Engine Signoff

- [x] Add regression tests for key calculations.
- [x] Add product copy for the differentiator.
- [x] Update demo script and seed data.
- [x] Update roadmap status.

Acceptance:

- Cost engine is sellable as FlowForce's core advantage.

Verification:

- Release gates and product demo both pass.

Status:

- Completed on 2026-05-28.
- Signoff doc: [docs/cost-engine-signoff.md](../cost-engine-signoff.md)
- Signoff grants migration: [20260528001000_phase5_cost_engine_signoff_grants.sql](../../supabase/migrations/20260528001000_phase5_cost_engine_signoff_grants.sql)
- Audit-closure migration: [20260528001100_phase5_cost_basis_artifact_closure.sql](../../supabase/migrations/20260528001100_phase5_cost_basis_artifact_closure.sql)
- Regression test: [supabase/tests/phase5_cost_engine_regression.test.sql](../../supabase/tests/phase5_cost_engine_regression.test.sql)
- Phase report: [05.10 Cost Engine Signoff](./reports/05-10-cost-engine-signoff-2026-05-28.md)
