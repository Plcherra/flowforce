# FlowForce Platform Architecture Roadmap

Date: 2026-05-26

## What The Conversation Planned

The plan is to turn FlowForce into a restaurant/retail operations platform that can replace a multi-app stack:

- Workforce management: employees, schedules, messaging, tasks, recognition, training.
- Restaurant operations execution: checklists, SOPs, forms, compliance, manager workflows.
- MarketMan-like inventory and purchasing: items, units, counts, suppliers, purchasing, production, waste, food-cost tracking.
- FlowForce-only advantage: connect those modules together so staffing, inventory, labor cost, food cost, compliance, and AI recommendations share one tenant data model.

The business positioning is:

> Replace fragmented checklist, workforce, and inventory tools with one connected operating system for restaurants and service businesses.

The technical direction discussed was:

- Keep Next.js as the main web app.
- Make FlowForce available as a mobile app.
- Move toward a monorepo with shared business logic and types.
- Add Docker/Contabo deployment readiness.
- Keep Supabase as the database/auth/storage foundation for now.
- Eventually support stronger platform separation: web, mobile, API, shared core, shared UI, and deployment infrastructure.

## Current Repo Reality

Current source shape:

- Approximately 1,600 source-controlled files excluding `node_modules` and `.next`.
- `src/features` already contains about 630 files, so the app has partial feature-based organization.
- `app/app` has about 54 route files.
- `supabase` has about 70 migration/test/config files and has recently been hardened through Phase 21.
- There is an archived Capacitor config, but no active mobile app package yet.

The safest implementation path is not a full repo rewrite. It should be a staged transition that keeps the app shippable after every phase.

## File Count Estimate

There are two possible interpretations of the plan:

### Shipping-First Mobile + Docker Path

This keeps the existing Next app mostly where it is, adds a mobile wrapper, improves shared module boundaries, and adds production infrastructure.

Estimated change size:

- New files: 45-85
- Modified files: 45-90
- Total touched files: 90-175

This is the recommended path.

### Full Monorepo + Expo + Separate API Path

This moves the current app into `apps/web` or `packages/web`, extracts shared packages, creates a native app, and may split backend API code.

Estimated change size:

- New files: 110-180
- Modified/moved files: 120-250
- Total touched files: 230-430

This is more powerful long-term, but too risky as the immediate next move if shipment readiness is still the priority.

## Recommended 10-Phase Plan

### Phase 1: Architecture Decision Record

- [ ] Decide the first mobile path: Capacitor wrapper first, Expo native later.
- [ ] Decide package manager and monorepo timing: keep npm for now or move to pnpm/Turbo.
- [ ] Decide whether to keep Next API routes or create a separate API service.
- [ ] Document the target module boundaries for web, mobile, Supabase, integrations, and AI.

Expected files: 1-3 docs.

Acceptance:

- A single architecture document exists.
- The team knows what is happening now versus later.
- No code movement happens before the boundaries are agreed.

### Phase 2: Module Ownership Map

- [ ] Map each visible product module to its source files, Supabase tables, tests, and permissions.
- [ ] Identify which modules are already real and which still depend on demo/stub data.
- [ ] Mark the core differentiators: inventory + scheduling + food/labor cost + AI.
- [ ] Create a migration checklist for risky modules.

Expected files: 2-5 docs/scripts.

Acceptance:

- Every major route has an owner module.
- Every module lists its data source and shipment status.
- Demo/stub areas are visible instead of hidden.

### Phase 3: Shared Contracts And Types

- [ ] Create a shared contract layer for tenant, user, permission, inventory, scheduling, task, and analytics types.
- [ ] Normalize API/result types and error shapes.
- [ ] Keep exports compatible with the current Next app.
- [ ] Avoid moving UI until types are stable.

Expected files: 20-35 new/modified files.

Acceptance:

- Typecheck passes.
- Existing routes continue working.
- Shared types are imported from one clear location.

### Phase 4: Data Access Boundary

- [ ] Create module-level repositories/services around Supabase queries.
- [ ] Remove direct random Supabase calls from high-value pages where practical.
- [ ] Start with inventory, scheduling, employees, tasks, and analytics.
- [ ] Keep RLS as the real security layer; services only standardize access and errors.

Expected files: 25-50 new/modified files.

Acceptance:

- Core modules fetch through a consistent service boundary.
- Query keys and cache invalidation are predictable.
- Existing pgTAP and deploy gates remain green.

### Phase 5: Inventory + Scheduling Cost Engine

- [ ] Add the real differentiator: scheduled labor plus inventory usage plus production/waste cost.
- [ ] Create views/RPCs for shift cost, stock needs, upcoming shortages, and waste impact.
- [ ] Surface this in the inventory and dashboard UI.
- [ ] Add tests for tenant isolation and calculation correctness.

Expected files: 25-50 new/modified files.

Acceptance:

- FlowForce can answer: "What will this schedule cost in labor and inventory?"
- The dashboard shows combined labor, inventory, purchasing, and waste signals.
- This becomes the core sales argument against fragmented checklist, workforce, and inventory tools.

### Phase 6: AI Operations Copilot Foundation

- [ ] Define approved AI actions and read-only insights separately.
- [ ] Add deterministic prompt contracts for scheduling, inventory, waste, and compliance insights.
- [ ] Log AI requests, outputs, latency, and user approvals.
- [ ] Do not allow uncontrolled writes; use approval or policy-guarded actions.

Expected files: 20-40 new/modified files.

Acceptance:

- AI can recommend operational actions with evidence.
- Users can approve/reject actions.
- AI behavior is auditable and tenant-scoped.

### Phase 7: Mobile App Path

- [ ] Start with Capacitor around the current Next/PWA app if the goal is fastest iOS/Android availability.
- [ ] Add native shell config, app icons/splash, deep links, and safe-area handling.
- [ ] Verify the main mobile workflows: dashboard, tasks, messages, schedule, forms, inventory counts.
- [ ] Keep Expo/native as a later phase only if offline/native UX demands it.

Expected files:

- Capacitor-first: 15-35 new/modified files.
- Expo-native later: 70-130 additional files.

Acceptance:

- The same deployed web app can be packaged for iOS/Android.
- Auth, routing, storage, and mobile viewport behavior work.
- App store blockers are documented.

### Phase 8: Offline, Push, And Field Execution

- [ ] Add offline-safe workflows for inventory counts, forms/checklists, tasks, and shift notes.
- [ ] Add queued mutations with retry and conflict handling.
- [ ] Add push notification infrastructure for tasks, schedule changes, messages, approvals, and low stock.
- [ ] Add mobile smoke tests or manual QA scripts.

Expected files: 25-45 new/modified files.

Acceptance:

- Field users can work through weak connectivity.
- Managers receive actionable notifications.
- Failed sync is visible and recoverable.

### Phase 9: Docker + Contabo Production Runtime

- [ ] Add production Dockerfile for the current Next app.
- [ ] Add docker compose for FlowForce services.
- [ ] Add Nginx/Caddy reverse proxy config.
- [ ] Add backup, restore, deploy, health-check, and log scripts.
- [ ] Keep Supabase managed unless a separate self-hosted database decision is made.

Expected files: 15-30 new/modified files.

Acceptance:

- A fresh VPS can deploy FlowForce from documented commands.
- Health checks prove the app is alive.
- Backups and rollback are documented and tested.

### Phase 10: Release Gates And Launch Readiness

- [ ] Update GitHub Actions for the chosen architecture.
- [ ] Add mobile build validation if Capacitor/Expo is active.
- [ ] Add production smoke against the deployed target.
- [ ] Keep Supabase migration drift and security checks mandatory.
- [ ] Create a launch checklist focused on restaurant/retail operators.

Expected files: 10-25 new/modified files.

Acceptance:

- Main cannot go green with broken web, mobile, database, or deploy contracts.
- The launch checklist says exactly what remains before paid customers.
- The product story matches the actual app behavior.

## Recommended Next Move

Start Phase 1, then Phase 2. After that, choose:

- Fastest app store path: Capacitor first.
- Best long-term native app: Expo later.
- Best shipment discipline: keep Next.js stable and extract shared packages gradually.

The next implementation should create the architecture decision record and module ownership map before moving files.
