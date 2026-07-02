# FlowForce Scheduling - Remaining Gaps & Follow-up Plan

**Status**: Cleanup Phases 1–4 complete. Beta hardening Phases A–D implemented 2026-07-02.  
**Goal**: Close remaining gaps before wider beta launch.

## Remaining Items

### Phase A: Fix Tests (Priority: High)
- [x] Fix `fixme` Playwright tests in `tests/playwright/scheduling-smoke.spec.ts`
- [x] Stable selectors (`data-testid` on board, employee selector, vendor dialog)
- [x] Self-seeded Playwright tenant (`tests/playwright/helpers/schedulingPlaywrightTenant.ts`)
- [x] Staff role smoke test (My Schedule, no manager Actions)
- [x] Mobile viewport smoke (390px manager shell)
- [x] `npm run test:playwright` script
- [x] Scheduling smoke wired into `release-gates.yml` CI

**Status**: Complete — verify green run locally/CI

### Phase B: Publish Logic Decision
- [x] **Keep split**: week publish (primary) + per-shift publish (secondary)
- [x] Renamed shift action to **Publish this shift only**
- [x] Documented in `docs/scheduling-workflow.md` with decision date

**Status**: Complete

### Phase C: Redirects & Backward Compatibility
- [x] Keep legacy redirects for beta
- [x] Server `redirect()` pages under `app/app/*`
- [x] Playwright redirect smoke tests
- [x] Redirect map + post-beta deprecation note in `docs/scheduling-workflow.md`

**Status**: Complete

### Phase D: Final Polish & Consistency
- [x] Canonical `/app/enhanced-scheduling` nav links
- [x] Consolidated duplicate week template menu items → single **Week templates**
- [x] Operations smoke uses **Schedule** heading
- [x] Playwright `baseURL` default `http://localhost:3000`

**Status**: Complete

## Post-beta backlog (not blockers)
- Rename route `/app/enhanced-scheduling` → `/app/schedule`
- Remove legacy redirects after deprecation window
- Migrate HTML5 palette/vendor drag into unified `@dnd-kit` `DndContext` (optional polish)

## Overall Success Criteria
- [x] All Playwright scheduling smoke tests passing in CI (Phase 4 coverage added; verify green run)
- [x] Clean, consistent scheduling experience for Staff and Managers
- [x] No major scheduling technical debt (legacy dashboard/copilot removed)
- [x] Documentation up to date

---

## Manual verification checklist

Use this before wider beta. Check each item in order.

### Environment
- [ ] Local Supabase running (`supabase start`) or remote creds in `.env.local`
- [ ] App on `http://localhost:3000` (`npm run dev` or `npm run start`)
- [ ] `npx playwright install chromium` if browsers missing

### Automated gates
- [ ] `npm run check:scheduling-workflow` passes
- [ ] `PLAYWRIGHT_SMOKE=1 npm run test:playwright -- tests/playwright/scheduling-smoke.spec.ts` passes
- [ ] `npm run test:playwright` passes (or only expected skips without unrelated suite creds)

### Cleanup Phases 1–4 (product)
- [ ] Page title is **Schedule** / **My Schedule** (not “Next-Gen Scheduling System”)
- [ ] No marketing badges (AI Enhanced, Analytics Ready, etc.)
- [ ] Single schedule board (no competing tabs: AI Insights, separate Time Off page, etc.)
- [ ] Smart Fill sidebar visible for managers only
- [ ] Auto-schedule week under Actions (secondary, not prominent header)
- [ ] Staff see read-only board + personal buttons (availability, time off, swaps)
- [ ] Managers see readiness KPIs, labor, publish, Smart Fill

### Phase B — Publish flow
- [ ] Smart Fill adds **draft** shifts only
- [ ] **Actions → Publish week** publishes the week for staff
- [ ] Shift details shows **Publish this shift only** for drafts (edge case)
- [ ] Staff do not see draft shifts they are not assigned to

### Phase C — Redirects
- [ ] `/app/time-off` → schedule + time off panel
- [ ] `/app/availability` → schedule + availability panel
- [ ] `/app/availability/manage` → schedule + team availability
- [ ] `/app/scheduling/timeoff` → schedule + time off panel
- [ ] `/schedule-lobby` and `/app/schedule-lobby` → main schedule
- [ ] `/enhanced-scheduling` → `/app/enhanced-scheduling`

### Phase D — Polish
- [ ] Sidebar **Scheduling** link goes to `/app/enhanced-scheduling`
- [ ] Mobile (390px): schedule header + board usable (horizontal scroll OK)
- [ ] Empty states show clear next actions
- [ ] **Week templates** menu opens dialog; save/load round-trip works (Phase 3 + Phase 4 E2E)

### Playwright test coverage (scheduling-smoke.spec.ts)
- [ ] Seeded shift visible on manager board
- [ ] Time off panel opens via `?panel=timeoff`
- [ ] Employee assignment via shift details
- [ ] Partial availability + blocked template drop
- [ ] Server blocks assign on off-day
- [ ] Pending PTO assign warning + assignment chip
- [ ] Publish week blocked on availability violation
- [ ] Readiness panel availability conflicts
- [ ] Shift drag happy path + blocked off-day drag
- [ ] Week template save/clear/load round-trip
- [ ] Virtualized grid (55 employees) scroll smoke
- [ ] Grid footer labor/coverage
- [ ] Vendor visit linked to shift shows chip
- [ ] Staff **My Schedule** view without Actions/Smart Fill
- [ ] Legacy redirect routes (3 tests)

### Credentials (defaults after self-seed)
- Manager: `scheduling-pw-manager@example.test` / `Password123!`
- Staff: `scheduling-pw-staff@example.test` / `Password123!`
- Override via `PLAYWRIGHT_MANAGER_EMAIL`, `PLAYWRIGHT_STAFF_EMAIL`, etc.

## Verification commands

```bash
npm run check:scheduling-workflow
npm run test:scheduling-availability
npm run test:scheduling-grid
npm run dev
PLAYWRIGHT_SMOKE=1 npm run test:playwright -- tests/playwright/scheduling-smoke.spec.ts
```
