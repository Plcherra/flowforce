# FlowForce Scheduling — ConnectTeam Competitive Audit

**Date:** 2026-07-02  
**Baseline:** 46 / 100 (pre Phase 0)  
**Phase 4 target:** 85–92 / 100  
**Measured score:** **88 / 100**

**Scope:** Manager scheduling + availability after Phases 0–4 (`docs/scheduling-availability-improvements.md`). Staff hour-grid UX unchanged by design.

---

## Scorecard

| Category | Weight | Score | Evidence |
|----------|--------|-------|----------|
| Availability trust (engine + RPC parity) | 20 | **18** | Pure TS engine [`scheduleAvailabilityEngine.ts`](../src/features/scheduling/services/availability/scheduleAvailabilityEngine.ts) + [`evaluateShiftAssignment.ts`](../src/features/scheduling/services/availability/evaluateShiftAssignment.ts); SQL RPCs `assign_schedule_with_validation` / `publish_schedules_week_with_validation` in [`20260702190000_schedule_availability_validation.sql`](../supabase/migrations/20260702190000_schedule_availability_validation.sql); 9-case pgtap suite [`schedule_availability_validation.test.sql`](../supabase/tests/schedule_availability_validation.test.sql); unit runner [`test-schedule-availability-engine.mjs`](../scripts/test-schedule-availability-engine.mjs) (engine + copilot plan + readiness); Playwright off-day block, pending PTO warning, approved PTO block, publish gate |
| Manager grid UX (overlay, partial, PTO, legend) | 15 | **14** | [`WeekGrid.tsx`](../src/features/scheduling/components/drag-drop/WeekGrid.tsx) legend, partial hints, blocked/pending styling; Playwright partial label + blocked template drop, approved PTO overlay, availability-layer toggle |
| Speed (indexes, drag, virtualize, refetch) | 15 | **13** | [`gridIndexes.ts`](../src/features/scheduling/utils/gridIndexes.ts), memoized rows, `@tanstack/react-virtual` at ≥50 employees, `@dnd-kit` shift drag with `refresh: false` mutations, [`test-move-shift.mjs`](../scripts/test-move-shift.mjs), drag E2E via [`dndKitDrag.ts`](../tests/playwright/helpers/dndKitDrag.ts); no CI perf budget |
| Smart Fill / readiness / publish gates | 15 | **13** | [`copilotSchedulerPlan.test.ts`](../src/features/scheduling/hooks/copilotSchedulerPlan.test.ts), [`scheduleReadiness.test.ts`](../src/features/scheduling/utils/scheduleReadiness.test.ts), readiness panel + publish-week Playwright; Smart Fill **apply-to-board** flow not E2E (unit-tested plan math only) |
| Staff self-service (hour grid unchanged) | 10 | **9** | Staff smoke (My Schedule, no manager Actions/Smart Fill); hour-grid copy in [`AvailabilityRequestForm.tsx`](../src/features/availability/components/AvailabilityRequestForm.tsx); Playwright staff availability panel + cell toggle |
| Test & CI coverage | 15 | **14** | `test:scheduling-availability` + `test:scheduling-grid` + `check:scheduling-workflow` + Playwright smoke in [`release-gates.yml`](../.github/workflows/release-gates.yml); local verification: `npm ci`, unit scripts, contract check green (2026-07-02); SQL/Playwright require CI/local Supabase |
| Polish & consistency (nav, copy, mobile) | 10 | **7** | Mobile 390px smoke; canonical `/app/enhanced-scheduling` nav; dual drag (HTML5 palette/vendor + `@dnd-kit` shifts) deferred; route rename post-beta |

**Total: 88 / 100** — meets Phase 4 floor (≥85).

---

## Verification record (2026-07-02)

| Command | Result |
|---------|--------|
| `npx npm@10.9.8 ci` | Pass |
| `node scripts/test-schedule-availability-engine.mjs` | Pass |
| `npm run test:scheduling-grid` | Pass |
| `npm run check:scheduling-workflow` | Pass |
| `npm run test:scheduling-availability` (full, incl. SQL) | CI / local Supabase |
| `PLAYWRIGHT_SMOKE=1 npm run test:playwright -- tests/playwright/scheduling-smoke.spec.ts` | CI release-gates |

Local Docker was unavailable during audit; SQL and Playwright legs are enforced in release-gates on push to `main`.

---

## Top 5 gaps to reach 92

1. **Smart Fill apply E2E** (+1–2) — Playwright: seed `coverage_templates` + roster row, Suggest fills → Add drafts to board → draft shift on grid (blocked today by sparse `employees` table contract in tenant seed).
2. **Unified `@dnd-kit` for palette/vendor** (+1–2) — Migrate [`useDragDropHandlers.ts`](../src/features/scheduling/hooks/useDragDropHandlers.ts) into shared `DndContext` (Phase 4 deferred; low priority at 88/100).
3. **SQL ↔ TS parity contract test** (+1) — Golden vectors shared between pgtap and `scheduleAvailabilityEngine.test.ts` to guard RPC drift.
4. **Grid perf budget in CI** (+1) — Timing assertion for 55-employee virtualized scroll or drag latency smoke.
5. **Route `/app/schedule` rename** (+0 product, +1 polish) — Post-beta; redirects remain until deprecation window.

---

## Out of scope (unchanged)

- Rebuild availability engine or staff hour-grid UX
- Autonomous AI writes without manager approval
- Unrelated master roadmap phases

---

## Related docs

- [scheduling-availability-improvements.md](./scheduling-availability-improvements.md)
- [scheduling-remaining-gaps.md](./scheduling-remaining-gaps.md)
- [scheduling-workflow.md](./scheduling-workflow.md)
