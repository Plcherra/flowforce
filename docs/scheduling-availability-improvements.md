# FlowForce Scheduling Availability Improvements

**Goal**: Embed rich availability directly in the manager schedule grid so managers can assign shifts fast and accurately—full-day blocks, partial windows ("Until 1:30p"), PTO pending vs approved—while keeping the staff hour-grid self-service UX unchanged.

**Audit baseline**: 46 / 100 (ConnectTeam-competitive scheduling + availability)  
**Target after Phases 0–2**: 78–85 / 100

**Rules**:

- `staff_availability` is the canonical preference source (not `employees.availability` JSON).
- One pure domain engine (`scheduleAvailabilityEngine`) feeds grid, drag-drop, Smart Fill, and publish gates.
- Staff hour-grid in `AvailabilityRequestForm` stays as-is; copy clarifies filled = can work, empty = unavailable unless manager overrides.
- Client warns; server enforces blocking conflicts (Phase 2).

**Related docs**: [scheduling-workflow.md](./scheduling-workflow.md) · [scheduling-cleanup-phases.md](./scheduling-cleanup-phases.md)

---

## Phases

### Phase 0 — Foundation (Priority: High)

- [x] Migration: `availability_request` / `availability_exception` domain columns + RLS
- [x] Canonical types in `src/types/platform.ts` (`GridCellAvailability`, `AssignmentValidationResult`)
- [x] `scheduleAvailabilityEngine` + `timeWindows` helpers + unit tests
- [x] `fetchSchedulingWeek` loads `staff_availability` (+ exceptions)
- [x] Wire through `SchedulingContext` / `useSchedulingConsolidated`

**Acceptance**:

- Engine unit tests pass for: Mon off, Tue until 1:30p, Wed approved PTO, Thu pending PTO, Fri unavailability overlap
- Fresh DB migration applies; security audit SQL tests pass
- Week query returns preference rows for board week

**Status**: Completed (2026-07-02)

---

### Phase 1 — Grid-embedded availability (Priority: High)

- [x] Replace `disabledDates` with `cellAvailability` in `useScheduleBoard`
- [x] `WeekGrid` rich cells: partial labels, PTO styling, legend
- [x] `useDragDropHandlers` pre-drop validation via `evaluateAssignment`
- [x] Optional toolbar toggle: "Show availability layer"
- [x] Staff copy tweak only; hour grid unchanged
- [x] Playwright smoke: partial availability label + blocked drop

**Acceptance**:

- Manager sees Mon blocked / Tue "Until 1:30p" / pending PTO amber on grid
- Template drop blocked when shift extends past availability window
- Staff hour-grid unchanged
- Manager grid visibility audit slice: 28 → ~70

**Status**: Completed (2026-07-02)

---

### Phase 2 — Trust + Smart Fill parity

- [x] Server RPC `assign_schedule_with_validation`
- [x] Publish week gate for blocking availability conflicts
- [x] Smart Fill uses engine (not JSON-only `employees.availability`)
- [x] `scheduleReadiness` delegates preference/outside-window checks to engine

**Target audit**: 78–85 / 100

**Status**: Completed (2026-07-02)

---

### Phase 2 file map

| Action | Path |
|--------|------|
| Create | `supabase/migrations/20260702190000_schedule_availability_validation.sql` |
| Create | `supabase/tests/schedule_availability_validation.test.sql` |
| Create | `src/features/scheduling/services/availability/evaluateShiftAssignment.ts` |
| Modify | `src/features/scheduling/repositories/schedulingRepository.ts` |
| Modify | `src/features/scheduling/hooks/useSchedulingConsolidated.ts` |
| Modify | `src/features/scheduling/hooks/useWeekMutations.ts` |
| Modify | `src/features/scheduling/hooks/copilotSchedulerMath.ts` |
| Modify | `src/features/scheduling/hooks/copilotSchedulerPlan.ts` |
| Modify | `src/features/scheduling/hooks/useCopilotScheduler.ts` |
| Modify | `src/features/scheduling/services/autoScheduler.ts` |
| Modify | `src/features/scheduling/utils/scheduleReadiness.ts` |
| Modify | `src/features/scheduling/components/ScheduleReadinessPanel.tsx` |
| Modify | `src/features/scheduling/components/SmartFillSidebar.tsx` |
| Modify | `src/features/scheduling/components/ShiftDetailsPanel.tsx` |
| Modify | `src/features/scheduling/components/ShiftWizardDialog.tsx` |
| Modify | `tests/playwright/scheduling-smoke.spec.ts` |

---

### Phase 2 verification

- [x] `assign_schedule_with_validation` blocks off-day assign (SQL + Playwright)
- [x] Pending PTO assign returns warning severity, still inserts
- [x] Publish week blocked when assigned shift violates availability window
- [x] Smart Fill skips employees with no `staff_availability` for slot day
- [x] Readiness panel shows availability conflicts using engine rules

**Proof**:
- SQL: `supabase/tests/schedule_availability_validation.test.sql`
- Unit: `copilotSchedulerPlan.test.ts`, `scheduleReadiness.test.ts`
- Playwright: `tests/playwright/scheduling-smoke.spec.ts`

---

### Phase 3 — Beat ConnectTeam on speed

- [x] `@dnd-kit` — drag shifts between employees/days
- [x] Inline labor + coverage in grid footers
- [x] Tenant week templates from DB
- [x] Virtualized grid for 50+ employees

**Status**: Completed (2026-07-02)

**Acceptance**:
- Manager can drag assigned shifts between employee/day cells with availability warn/block parity
- Grid footer shows per-day labor hours and coverage percentage
- Week templates save/load via `week_templates.template_data`
- Employee rows virtualize when roster ≥ 50

**Verification**:
- `node scripts/test-week-template-serializer.mjs`
- `node scripts/test-move-shift.mjs`
- `npm run test:scheduling-availability`
- Playwright: grid footer smoke in `scheduling-smoke.spec.ts`

---

### Phase 3 file map

| Action | Path |
|--------|------|
| Create | `src/features/scheduling/utils/gridIndexes.ts` |
| Create | `src/features/scheduling/components/drag-drop/WeekGridFooter.tsx` |
| Create | `src/features/scheduling/components/drag-drop/ShiftChip.tsx` |
| Create | `src/features/scheduling/services/moveShift.ts` |
| Create | `src/features/scheduling/hooks/useShiftDragDrop.tsx` |
| Create | `src/features/scheduling/utils/weekTemplateSerializer.ts` |
| Modify | `src/features/scheduling/hooks/useScheduleBoard.ts` |
| Modify | `src/features/scheduling/components/drag-drop/WeekGrid.tsx` |
| Modify | `src/features/scheduling/components/DragDropScheduleCalendar.tsx` |
| Modify | `src/features/scheduling/utils/hoursCalculation.ts` |
| Modify | `src/features/scheduling/hooks/useWeekTemplates.tsx` |
| Modify | `src/features/scheduling/components/WeekTemplateDialog.tsx` |
| Modify | `tests/playwright/scheduling-smoke.spec.ts` |
| Modify | `package.json` — `@dnd-kit/core`, `@dnd-kit/utilities`, `@tanstack/react-virtual` |

---

### Phase 4 — Grid trust, coverage & CI parity

**Target audit**: 85–92 / 100 (ConnectTeam-competitive scheduling)

**Status**: Completed (2026-07-02)

**Audit score**: **88 / 100** — see [scheduling-connectteam-audit-2026-07.md](./scheduling-connectteam-audit-2026-07.md) (2026-07-02)

- [x] Phase 2 verification closed (SQL + unit + Playwright)
- [x] Shift drag E2E (`dndKitDrag` helper, happy + blocked paths)
- [x] Week template save → clear → load round-trip E2E
- [x] Virtualization smoke (55 employees)
- [x] Targeted cache invalidation after shift move (`refresh: false` on drag mutations)
- [x] Memoized `EmployeeRow` / `GridCell`
- [x] `test:scheduling-availability` + `test:scheduling-grid` in release gates
- [ ] HTML5 palette → unified `DndContext` (deferred post-Phase 4)

**Verification**:
- `npm run test:scheduling-availability` (engine + plan + readiness + SQL RPC tests)
- `npm run test:scheduling-grid`
- `PLAYWRIGHT_SMOKE=1 npm run test:playwright -- tests/playwright/scheduling-smoke.spec.ts`

**Phase 4 file map**

| Action | Path |
|--------|------|
| Modify | `supabase/tests/schedule_availability_validation.test.sql` |
| Create | `src/features/scheduling/hooks/copilotSchedulerPlan.test.ts` |
| Create | `src/features/scheduling/utils/scheduleReadiness.test.ts` |
| Create | `tests/playwright/helpers/dndKitDrag.ts` |
| Modify | `tests/playwright/scheduling-smoke.spec.ts` |
| Modify | `src/features/scheduling/hooks/useSchedulingConsolidated.ts` |
| Modify | `src/features/scheduling/hooks/useShiftMutations.ts` |
| Modify | `src/features/scheduling/hooks/useShiftDragDrop.tsx` |
| Modify | `src/features/scheduling/components/drag-drop/WeekGrid.tsx` |
| Modify | `src/features/scheduling/components/ScheduleReadinessPanel.tsx` |
| Modify | `src/features/scheduling/components/WeekTemplateDialog.tsx` |
| Modify | `scripts/test-schedule-availability-engine.mjs` |
| Modify | `scripts/check-scheduling-workflow-contract.mjs` |
| Modify | `package.json`, `.github/workflows/release-gates.yml` |

---

## File map (Phase 0 + 1)

| Action | Path |
|--------|------|
| Create | `src/features/scheduling/services/availability/scheduleAvailabilityEngine.ts` |
| Create | `src/features/scheduling/services/availability/scheduleAvailabilityEngine.test.ts` |
| Create | `src/features/scheduling/utils/timeWindows.ts` |
| Create | `supabase/migrations/20260702180000_availability_workflow_columns.sql` |
| Modify | `src/types/platform.ts` |
| Modify | `src/features/scheduling/repositories/schedulingRepository.ts` |
| Modify | `src/features/scheduling/hooks/useSchedulingConsolidated.ts` |
| Modify | `src/features/scheduling/hooks/useScheduleBoard.ts` |
| Modify | `src/features/scheduling/components/drag-drop/WeekGrid.tsx` |
| Modify | `src/features/scheduling/hooks/useDragDropHandlers.ts` |
| Modify | `src/features/scheduling/components/drag-drop/types.ts` |
| Modify | `src/features/availability/components/AvailabilityRequestForm.tsx` |
| Modify | `tests/playwright/scheduling-smoke.spec.ts` |

---

## Manual verification checklist

### Engine (Phase 0)

- [x] `npm run test -- scheduleAvailabilityEngine` passes (via `test:scheduling-availability`)
- [x] Monday with no preference rows → `status: blocked` (engine unit tests)
- [x] Tuesday preference 06:00–13:30 → `hint: "Until 1:30p"`, partial status (engine + Playwright)
- [x] Approved PTO → full-day block; pending PTO → warning, assign allowed (engine + Playwright)

### Grid (Phase 1)

- [x] Open Schedule as manager; availability legend visible above grid (Playwright)
- [x] Employee with Mon off shows red hatch + "Off" (engine; grid blocked overlay)
- [x] Employee with partial day shows "Until X" label (Playwright)
- [x] Pending PTO shows amber border + "PTO pending" (Playwright pending PTO test)
- [x] Dropping a shift template past availability window shows toast and blocks drop (Playwright)
- [ ] Staff availability panel save refreshes manager grid (manual cross-session check)

### Staff (unchanged)

- [x] Staff hour grid still works (Mon–Sun × 6am–9pm toggles) (Playwright staff panel)
- [x] Copy: filled = can work; empty = not available unless manager overrides (Playwright)

---

## Success criteria (Phases 0 + 1)

- One canonical availability engine for grid (and later Smart Fill / publish)
- Manager grid shows full-day block, partial "Until X", PTO pending vs approved
- Template drops blocked when shift violates availability window
- Staff hour-grid UX unchanged
- Engine unit tests + scheduling smoke pass in CI
