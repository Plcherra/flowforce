# 12 Inventory To Beat MarketMan

Date: 2026-09-17

Status: Not started. Plan 05 signed off the cost-engine math. This file is the operator-facing inventory product: a manager can run items, counts, purchasing, waste, and prep from one honest workspace and see food cost next to labor. It does not replace Phase 09 live integrations or Phase 10 launch work.

## Goal

A restaurant owner can leave MarketMan because FlowForce does the daily inventory loop **and** ties it to the schedule, labor, tasks, and cost they already run here. Numbers on screen are this tenant’s numbers. Empty looks empty. No second inventory login.

## How We Beat MarketMan

MarketMan wins today on catalog depth, distributor catalogs, and years of count/PO muscle. We do not claim that parity in this plan.

FlowForce wins if a GM can:

1. Count, receive, waste, and prep without leaving the same app they use for the schedule.
2. Trust on-hand, low stock, and inventory value the same way they trust a count sheet.
3. See **why** to prep or order from the upcoming week, not only from a static PAR.
4. See inventory cost next to labor and waste on the same day, not in a separate food-cost silo.

Honest v1 advantage: **connected restaurant cost**, not a Sysco punch-out clone.

## Matching State

1. **On-hand** comes from `inv_stock_positions` (lots, receipts, waste, production, transfers). Never from `min_stock_level`. Never from `Math.random()`. Never from hardcoded `1,234`.
2. **Low stock** is on-hand below min (or PAR), by item and storage location.
3. **Inventory value** is on-hand × cost basis (weighted receipt or item fallback), same rules as the 05 cost model.
4. **Catalog** is one place: items, units, categories, suppliers, storage rooms. The nav **Items & Setup** is that place.
5. **Counts** write expected from stock position and variance from counted − expected. Approve updates what the next count expects.
6. **Purchasing** receive updates on-hand and cost basis. A PO that is never received does not invent stock.
7. **Waste / adjust / transfer** are the same movement model. Every line has item, qty, unit, location, reason, cost impact, actor.
8. **Prep / PAR / recipes** use real items. No Burger Patties demo row on a live tenant.
9. **Dashboard and the health strip** use the same stats helper. If there is no count, say “No count yet.” Do not show 97.4%.
10. **Import / export** is CSV (and the existing MarketMan migration contract). Live MarketMan API, POS theoreticals, and distributor punch-out stay out of this plan.

**Reuse, do not rebuild:** `inv_stock_positions`, count expected/variance, purchase receive, waste cost, recipe production costing, and `docs/marketman-migration-path.md`. This plan finishes the operator UI and closes the holes 05 marked done on paper.

## Decision: One Loop, One Catalog, No Theater

If we polish the current dashboard and leave `/app/inventory/items` as a stub, we still lose to MarketMan. If we rebuild the cost engine, we waste the 05 work.

**Keep the engine. Finish the loop.**

| Layer | Source of truth | What the UI may show |
|---|---|---|
| Catalog | `inv_items`, units, categories, suppliers, `inv_locations` | Names, SKU, units, min/PAR, cost fallback, preferred supplier |
| On-hand | `inv_stock_positions` | Qty and value by item and room |
| Count | `inv_counts` + lines | Expected, counted, variance, missing lines |
| Buy | purchase orders + receive | Open / received / cost in |
| Leave | waste, adjustments, transfers | Qty out, reason, $ impact |
| Make | recipes + production / prep | Ingredients deducted, yield, PAR gap |
| Home | same queries as above | Empty or real. Never sample unless labeled and excluded from actuals |

## Today vs Agreed (Review Snapshot 2026-09-17)

### Dashboard

**Agreed.** Cards show this company’s item count, low-stock count, on-hand value, and waste $. Empty tenant shows zeros and “Add your first item.”

**Today.** `/app/inventory` hardcodes 1,234 items, $45,231, 23 low stock. The strip under the tabs hardcodes 97.4% / 82% / $1.2k on every inventory page.

### Items & Setup

**Agreed.** Nav opens a working catalog: add item, units, category, supplier, storage room. Setup health is real.

**Today.** Nav goes to a stub (“Manage your inventory items here”). The real `ItemsSetup` page is on `/app/items-setup` and is not in the inventory nav. Import, History, Suppliers, Locations, and Settings tabs are dead or “coming soon.” Stock status treats min as on-hand.

### Prep & PAR

**Agreed.** List is this company’s items under PAR, or an empty state.

**Today.** Burger Patties and Chopped Lettuce are mocked. Load Template / Export / Save do nothing. Real items are loaded and ignored.

### Counts / Purchasing / Waste

**Agreed.** Same honesty as dashboard. Dead Import buttons hidden. Receive and waste move stock.

**Today.** Counts and purchasing/waste are the most real surfaces. Import Count still does nothing. Purchasing empty states are honest zeros. The fake health strip still sits above them.

### Stats helper

**Agreed.** One function. Low stock and value use stock position.

**Today.** `InventoryService.getDashboardStats` fakes low stock as 20% of items with a min. `lowStock()` invents current qty with `Math.random()`. Value sums `cost_per_unit` and ignores quantity.

## Operator Loop We Must Win

A week in a 40-seat restaurant, without MarketMan:

1. Monday: add or import items, units, rooms, suppliers.
2. Tuesday: opening count. Variance visible. Approve.
3. Wednesday: low-stock / PAR list becomes a PO. Receive Thursday. On-hand and cost basis move.
4. Friday: waste on 2 lb salmon. Cost hits the waste board and the day.
5. Saturday: prep list from PAR or the weekend schedule. Completing prep deducts ingredients.
6. Sunday: owner sees usage, waste $, purchases, and labor on the same week — not a CSV from another app.

If any step shows a demo number, the plan is not done.

## Phases

Do not start a later phase until the current one is accepted. Do not commit unless asked.

### Phase 1: Honest home and one catalog door

- [x] Delete hardcoded KPI cards on `routes/Dashboard.tsx`
- [x] Delete or unmount the static `InventorySummaryBoard` (97.4% / 82% / $1.2k)
- [x] Point `/app/inventory/items` at `ItemsSetup` (or redirect `/app/items-setup` there). One catalog.
- [x] Hide Import Items, Import Count, History, Quick Actions, Load/Export/Save Plan until they write data
- [x] Empty tenant: zeros + next action (“Add item”, “Start count”), no sample burgers

Acceptance: a new company sees 0 items and 0 value. Opening Items & Setup shows the real catalog, not a sentence.

Verification: browser on `/app/inventory` and `/app/inventory/items` with Pedro’s empty-ish tenant. No 1,234. No 97.4%.

### Phase 2: Catalog a count can stand on

- [x] Item create/edit: name, SKU, category, base unit, item units, min/PAR, fallback cost, preferred supplier, default room
- [x] Categories, suppliers, and storage rooms are real CRUD on the same page (no “coming soon”)
- [x] On-hand and value on the item row come from `inv_stock_positions`, not min
- [x] Low-stock badge: on-hand &lt; min
- [x] Setup health blocks “ready for counts” until unit + at least one room exist
- [x] `getDashboardStats` / `lowStock()` stop using `* 0.2` and `Math.random()`

Acceptance: add “Salmon / lb / Walk-in / $12.” Dashboard item count is 1. Value is 0 until a count or receive. Set min 5 with on-hand 0 → low stock 1.

Verification: item tests + `npm run typecheck`. Manual add/edit/delete. No confirm-only delete without undo or a real confirm dialog.

### Phase 3: Counts managers trust

- [x] New count picks rooms and items that exist
- [x] Expected qty from stock position; counted ≥ 0; variance saved
- [x] Missing lines and net variance visible before approve
- [x] Approve is the moment the next expected qty follows the count (already modeled — prove it in UI)
- [x] Staff-sized count screen (one item at a time or a tight table). No fake Import.

Acceptance: count 10 salmon when expected is 0. After approve, on-hand is 10 and dashboard value uses the item cost.

Verification: existing count/stock tests still pass. Manual opening count on one room.

### Phase 4: Buy and receive that move stock

- [ ] Item preferred supplier is the supplier used on the PO line
- [ ] Create PO from catalog (and later from low stock / PAR)
- [ ] Receive writes qty and unit cost into stock/lots and cost basis
- [ ] Open / pending / received statuses match what purchasing already stores
- [ ] Suggested order from low stock or PAR gap (no schedule yet)

Acceptance: PO 20 lb salmon at $11, receive 20. On-hand 30 if 10 were already counted. Value uses the new basis, not a random card.

Verification: purchase-receive tests from 05.05 still pass. Manual PO + receive on the same item as Phase 3.

### Phase 5: Waste, adjust, transfer

- [ ] Waste: item, qty, unit, room, reason, $ impact from cost basis
- [ ] Adjustment: same movement model, audited actor
- [ ] Transfer: room A → room B, company total unchanged
- [ ] Waste board this week is the sum of those events, not $1,234

Acceptance: waste 2 lb salmon. On-hand drops. Dashboard waste $ moves. Transfer does not change company total.

Verification: waste/adjustment tests. Manual waste + transfer.

### Phase 6: Prep, PAR, recipes on real items

- [ ] Remove `mockPrepItems` (Burger Patties / Chopped Lettuce)
- [ ] PAR min/max on the item (or recipe yield) drive the prep list
- [ ] Empty state if no PAR and no recipe
- [ ] Completing prep / production deducts ingredients and can add the finished item
- [ ] Cookbook stays behind its flag until recipes have a real item + yield

Acceptance: set PAR on salmon or a prep recipe. List shows that item only. Start/complete prep changes stock. Save/Export stay hidden until they persist.

Verification: production costing tests from 05.03. Manual prep on a real item.

### Phase 7: Home and reports that match the loop

- [ ] Inventory home: items, low stock, on-hand value, open POs, waste $, last count date, prep due — all live
- [ ] Reports: usage, count variance, waste $ by reason, purchase spend. No placeholder arrays
- [ ] Source labels if any row is estimated or imported (same rule as owner actuals)
- [ ] One header: keep the inventory nav; drop the second giant page H1 or make it the page title only

Acceptance: after phases 3–6, every card on home equals the list you can click through. Reports do not show random low stock.

Verification: browser walk Dashboard → Items → Count → PO → Waste → Prep → Reports on one item.

### Phase 8: Beat MarketMan (connected week)

- [ ] Upcoming schedule informs prep qty and “order before Saturday”
- [ ] Command-center inventory cards use the same live stats (no leftover 1,234)
- [ ] CSV import/export for items, units, suppliers, opening counts (MarketMan cutover packet; contract already in `marketmanMigrationPath.ts`)
- [ ] Mobile-usable count (viewport + one-thumb entry). Native offline stays Phase 08.

Acceptance: a GM can run one operating week in FlowForce and not open MarketMan for counts, POs, waste, or prep. Owner can see that week’s inventory $ next to labor.

Verification: demo script steps 5–6 use live tenant data, not sample-labeled leftovers. `npm run check:marketman-migration` still passes.

## Out Of Scope

- Live MarketMan API sync (09.05 is import/contract only)
- Live distributor catalogs, punch-out, or EDI (Sysco / US Foods)
- POS theoretical usage / sales mix (09.06+)
- Accounting/payroll export parity
- Rebuilding the 05 cost tables or `inv_stock_positions`
- Autonomous AI writes of counts or POs
- Claiming “we replace every MarketMan report” before Phase 7 is true

## Do Not

- Ship a dashboard number that is not this company
- Leave two item screens (`/app/inventory/items` stub vs `/app/items-setup`)
- Treat `inv_locations` as company sites (rooms stay rooms; people sites are a later HR decision)
- Mix sample/demo financials into owner actuals
- Start Phase 8 while Phase 1 still shows 1,234

## Verification (plan)

- Empty tenant: 0 / 0 / 0 and a real Items screen
- One item → count → receive → waste → prep: on-hand and $ move each time
- `InventoryService.lowStock` has no `Math.random`
- `npm run typecheck` passes after each phase
- Existing count / purchase / waste / cost SQL tests still pass
- Manual: inventory nav never shows the stub sentence

## Close Rule

Do not invent a Phase 9. When Phase 8 is accepted, this file is Complete. Later polish (barcode hardware, label printers, full offline counts) is asked for separately.
