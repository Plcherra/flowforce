# FlowForce Scheduling Cleanup Plan

**Goal**: Make the scheduling experience simple, fast, and focused for restaurant/coffee shop managers and staff. Remove bloat and competing features.

**Rules**:

- Delete (do not hide) code/features we are not keeping.
- Auto-Schedule Week should remain as a simple, reachable secondary button (not prominent in header).
- Delete competing AI features (AI Insights tab, etc.) unless explicitly kept.

**Workflow guide**: [scheduling-workflow.md](./scheduling-workflow.md)

---

## Phases

### Phase 1: Collapse & Simplify (Priority: High)

- [x] Rename page title from "Next-Gen Scheduling System" to simply "Schedule"
- [x] Remove all marketing badges ("AI Enhanced", "Analytics Ready", "Real-time", etc.)
- [x] Simplify and improve the 5 readiness KPI cards (better labels + stronger actions)
- [x] Reduce top-level tabs — keep only "Schedule" as the main/default view
- [x] Improve empty states with clear next actions
- [x] Clean up header (remove Diagnostics, Checklist if unused, etc.)

**Status**: Completed (2026-07-02)

---

### Phase 2: Consolidate AI Features (Priority: High)

- [x] Delete AI Insights tab entirely
- [x] Keep Auto-Schedule Week only as a simple secondary button (e.g. in toolbar or under "More options")
- [x] Make Copilot / Suggest Coverage the primary smart scheduling tool on the main Schedule tab
- [x] Remove any other competing auto-scheduling logic

**Status**: Completed

---

### Phase 3: Role-Based Views & Contextual Panels

- [x] Implement clear role-based UI (Staff sees only their schedule + availability + time off requests)
- [x] Convert Availability, Time Off, and Swaps into contextual slide-over drawers (triggered from readiness cards or gaps)
- [x] Clean up Staff Management section

**Status**: Completed (2026-07-02)

---

### Phase 4: Final Cleanup & Polish

- [x] Delete all dead/legacy code (`WeeklySchedulingDashboard`, `SchedulingCopilotPanel`, `ComplianceMonitor`, `schedule-lobby`, unused routes, etc.)
- [x] Final UI polish, empty states, and mobile responsiveness
- [x] Update documentation
- [x] Reconcile publish logic (documented split: Smart Fill drafts vs board week publish)

**Status**: Completed (2026-07-02)

---

## Success Criteria

- [x] Manager lands on a clean "Schedule" page and can build/publish a week quickly
- [x] No competing AI buttons or confusing tabs
- [x] Staff only see relevant views
- [x] Labor cost and coverage are clearly visible (managers)
- [x] Publish flow is documented and consistent
