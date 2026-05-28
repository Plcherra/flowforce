# 04 Web App Product Completion

## Goal

Finish the current Next.js app into a coherent, real-data, production-quality web product before deep native mobile or large architectural rewrites.

## Phases

### Phase 1: Visible Module Inventory

- [x] List all visible routes.
- [x] Mark production, beta, hidden, or deprecated status.
- [x] Identify demo-data dependencies.
- [x] Align navigation to real modules.

Acceptance:

- Users cannot wander into broken product surfaces.

Verification:

- Authenticated smoke route list matches the production navigation.

Status:

- Completed on 2026-05-28.
- Phase report: [04.01 Visible Module Inventory](./reports/04-01-visible-module-inventory-2026-05-28.md)

### Phase 2: Dashboard Command Center

- [ ] Replace generic metrics with operator-critical cards.
- [ ] Add labor, inventory, task, schedule, and risk summaries.
- [ ] Add action-first manager widgets.
- [ ] Add mobile-responsive dashboard layout.

Acceptance:

- Dashboard answers "what needs attention today?"

Verification:

- Dashboard loads with real tenant data and no console schema errors.

### Phase 3: Employees And HR Completion

- [ ] Finish employee profiles, roles, departments, availability, certifications, and performance links.
- [ ] Remove remaining demo-only HR data.
- [ ] Add manager actions and staff self-service states.
- [ ] Add empty/import states.

Acceptance:

- A customer can operate basic staff management.

Verification:

- Employee module smoke and permission tests pass.

### Phase 4: Scheduling Completion

- [ ] Finish shift creation, assignment, availability, time off, and schedule views.
- [ ] Add schedule conflict warnings.
- [ ] Add manager approval flows.
- [ ] Prepare schedule data for cost engine.

Acceptance:

- A manager can build and review a schedule.

Verification:

- Scheduling smoke and tenant tests pass.

### Phase 5: Tasks And Goals Completion

- [ ] Finish task CRUD, comments, assignment, reminders, and status workflows.
- [ ] Connect tasks to forms, operations, inventory, and AI suggestions.
- [ ] Add recurring task support where needed.
- [ ] Polish staff mobile/tablet task experience.

Acceptance:

- Tasks become a real execution layer.

Verification:

- Task workflows pass web and mobile viewport checks.

### Phase 6: Messages And Company Updates Completion

- [ ] Finish channels, direct messages, reactions, reads, and attachments.
- [ ] Finish announcements/company updates publishing.
- [ ] Add notification hooks.
- [ ] Ensure storage privacy and signed URLs remain correct.

Acceptance:

- Teams can communicate without leaving FlowForce.

Verification:

- Messaging smoke and storage privacy tests pass.

### Phase 7: Forms And Sections Completion

- [ ] Finish form builder, submissions, review, files, ratings, signatures, scans, and locations.
- [ ] Connect forms to operations workflows.
- [ ] Add template-based forms for restaurant/retail.
- [ ] Add manager review queue.

Acceptance:

- Forms support Jolt-style execution basics.

Verification:

- Form storage and tenant tests pass.

### Phase 8: Analytics And Reports Completion

- [ ] Replace placeholder analytics with real module summaries.
- [ ] Add exportable reports.
- [ ] Add owner and manager report views.
- [ ] Connect reports to cost engine and AI insights.

Acceptance:

- Reports answer real operator questions.

Verification:

- Analytics route loads without fake-only values.

### Phase 9: Settings And Admin Completion

- [ ] Finish company settings, permissions, integrations shell, feature flags, and admin tools.
- [ ] Add configuration completeness indicators.
- [ ] Add safe dangerous-action flows.
- [ ] Add audit links.

Acceptance:

- Admins can configure the workspace without developer help.

Verification:

- Settings changes persist and respect permissions.

### Phase 10: Web App Production QA

- [ ] Run full route smoke.
- [ ] Run mobile and desktop viewport QA.
- [ ] Fix text overflow, layout shifts, loading loops, and console errors.
- [ ] Update launch checklist.

Acceptance:

- Web app is ready for pilot customers.

Verification:

- Build, typecheck, smoke, Supabase gates, and release gates pass.
