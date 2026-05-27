# 05 Inventory Finance Cost Engine

## Goal

Build FlowForce's strongest differentiator: combine inventory, recipes, purchasing, waste, production, labor, scheduling, payroll, and expenses into one operational cost engine.

## Phases

### Phase 1: Canonical Cost Model

- [ ] Define labor cost, inventory cost, purchasing cost, waste cost, production cost, and shift cost.
- [ ] Define required tables/views/RPCs.
- [ ] Define calculation precision and currency behavior.
- [ ] Define tenant and permission rules.

Acceptance:

- Cost terms mean the same thing across modules.

Verification:

- Cost model doc maps to existing Supabase tables.

### Phase 2: Inventory Item And Unit Reliability

- [ ] Verify items, categories, units, item units, locations, and suppliers.
- [ ] Fix inconsistent unit conversion behavior.
- [ ] Add validation for missing unit/cost/location data.
- [ ] Add setup completeness indicators.

Acceptance:

- Inventory data can support calculations.

Verification:

- Item/unit tests and UI workflows pass.

### Phase 3: Recipe And Production Costing

- [ ] Connect recipe ingredients to item costs.
- [ ] Calculate produced item cost.
- [ ] Record production events and material usage.
- [ ] Track yield and waste.

Acceptance:

- FlowForce can calculate cost of produced/prepped items.

Verification:

- Production event tests cover material deduction and tenant safety.

### Phase 4: Counts And Stock Position

- [ ] Finish day-start/day-end count workflows.
- [ ] Calculate expected versus counted stock.
- [ ] Surface variance and missing counts.
- [ ] Add supervisor review.

Acceptance:

- Managers can trust current stock levels.

Verification:

- Count workflows pass mobile viewport QA.

### Phase 5: Purchasing And Supplier Flow

- [ ] Finish purchase orders and purchase lines.
- [ ] Connect suppliers to items and costs.
- [ ] Add received quantities and lot creation.
- [ ] Add purchasing status and approval flow.

Acceptance:

- Purchasing updates inventory and cost basis.

Verification:

- Purchase receipt tests update stock/cost safely.

### Phase 6: Waste And Adjustment Intelligence

- [ ] Finish waste events and inventory adjustments.
- [ ] Classify waste by type, reason, item, location, and shift where possible.
- [ ] Calculate cost impact.
- [ ] Add trend and outlier views.

Acceptance:

- Waste becomes measurable and actionable.

Verification:

- Waste dashboard and tests show correct cost impact.

### Phase 7: Labor And Schedule Cost

- [ ] Connect scheduled shifts to pay rates or labor estimates.
- [ ] Calculate planned labor cost.
- [ ] Calculate role/department/location labor breakdown.
- [ ] Prepare actual labor import path.

Acceptance:

- Schedule can produce labor cost estimates.

Verification:

- Schedule cost view/RPC returns tenant-scoped results.

### Phase 8: Unified Shift Profitability

- [ ] Combine labor, inventory, production, waste, purchases, and expenses.
- [ ] Add shift/day/location cost summaries.
- [ ] Add upcoming shortage and overstaffing signals.
- [ ] Add dashboard cards and reports.

Acceptance:

- FlowForce can answer "what will this shift cost and what should I prepare?"

Verification:

- Dashboard and report smoke pass with seeded cost data.

### Phase 9: Owner Financial Overview

- [ ] Finish owner P&L-style overview.
- [ ] Separate real data, estimated data, and imported data.
- [ ] Add approvals for expenses/payments.
- [ ] Add exportable summaries.

Acceptance:

- Owners can see operational cost without three separate apps.

Verification:

- No unlabeled demo financial data remains in production.

### Phase 10: Cost Engine Signoff

- [ ] Add regression tests for key calculations.
- [ ] Add product copy for the differentiator.
- [ ] Update demo script and seed data.
- [ ] Update roadmap status.

Acceptance:

- Cost engine is sellable as FlowForce's core advantage.

Verification:

- Release gates and product demo both pass.

