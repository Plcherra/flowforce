# FlowForce Scheduling — Simplified Workflow

The production scheduling experience lives at **`/app/enhanced-scheduling`**. One page, one board, contextual slide-over panels for secondary workflows.

## Who sees what

### Managers & owners
- **Schedule** header with week readiness KPIs (drafts, assignments, conflicts, labor)
- Drag-and-drop week board with publish controls in the board **Actions** menu
- **Smart Fill** sidebar for coverage suggestions (adds draft shifts; publish the week separately)
- **More options** menu: Staff management, Availability, Time off, Shift swaps, Automation

### Staff
- **My Schedule** header with personal summary cards (shifts, hours, time off, availability)
- Read-only week board showing **published shifts assigned to them**
- Direct buttons: **My availability**, **Time off**, **Swaps**
- No labor cost, publish, Smart Fill, or manager tooling

## Contextual panels (slide-over drawers)

Panels open on the same page via URL query params (bookmarkable):

| Panel | URL | Purpose |
|-------|-----|---------|
| Availability | `?panel=availability` | Personal grid; managers also get team tab (`&availability=team`) |
| Time off | `?panel=timeoff` | Staff request form; managers review/approve requests |
| Shift swaps | `?panel=swaps` | View and approve swap requests |
| Staff management | `?panel=staff` | Manager combined swaps + time off tabs |
| Automation | `?panel=workflow` | Workflows and reminders (managers only) |

Legacy redirects (still work):
- `/time-off`, `/app/time-off`, `/app/scheduling/timeoff` → schedule with time-off panel
- `/app/availability`, `/app/availability/manage` → schedule with availability panel
- `/schedule-lobby`, `/app/schedule-lobby` → main schedule page
- `/enhanced-scheduling` → `/app/enhanced-scheduling`

## Typical manager week

1. Open **Schedule** and review **Week readiness** cards.
2. Build the week on the board (copy week, templates, drag roles, Smart Fill drafts).
3. Assign staff and resolve conflicts (availability / time-off panels).
4. **Publish week** from the board toolbar **Actions** menu.
5. Staff see published shifts on **My Schedule**.

## Publish flow (intentional split)

**Decision (2026-07-02): Keep the split.** Week publish remains the primary go-live action; per-shift publish stays for edge cases only. No unification planned for beta.

- **Smart Fill → Add drafts to board** — inserts suggested *draft* shifts for review.
- **Board Actions → Publish week** — primary step; marks the week's shifts published for staff.
- **Shift details → Publish this shift only** — secondary action for one-off early publish before the rest of the week is ready.

This keeps suggestion/drafting separate from the final publish step managers use before staff go live.

## Legacy redirects (kept for beta)

Server redirects in `next.config.mjs` and App Router pages under `app/app/*` forward old URLs to the unified schedule page:

| Legacy URL | Destination |
|------------|-------------|
| `/time-off`, `/app/time-off`, `/app/scheduling/timeoff` | `/app/enhanced-scheduling?panel=timeoff` |
| `/app/availability` | `/app/enhanced-scheduling?panel=availability` |
| `/app/availability/manage` | `/app/enhanced-scheduling?panel=availability&availability=team` |
| `/schedule-lobby`, `/app/schedule-lobby` | `/app/enhanced-scheduling` |
| `/enhanced-scheduling` | `/app/enhanced-scheduling` |

**Post-beta:** plan to remove legacy redirect routes after one release cycle once analytics confirm no traffic (target: review after first paid pilot cohort).

## Key files

| Area | Path |
|------|------|
| Main page | `src/features/scheduling/components/NextGenSchedulingSystem.tsx` |
| Role gating | `src/features/scheduling/hooks/useSchedulingRole.ts` |
| Panels + URL | `src/features/scheduling/hooks/useSchedulingPanels.ts` |
| Readiness KPIs | `src/features/scheduling/components/ScheduleReadinessPanel.tsx` |
| Smart Fill | `src/features/scheduling/components/SmartFillSidebar.tsx` |
| Week board | `src/features/scheduling/components/DragDropScheduleCalendar.tsx` |

## Tests

- Playwright: `npm run test:playwright` (scheduling smoke requires `PLAYWRIGHT_SMOKE=1` + Supabase creds)
- Playwright smoke: `tests/playwright/scheduling-smoke.spec.ts`
- Workflow contract: `npm run check:scheduling-workflow`
- Supabase domain contracts: included in `npm run test:db:security`
