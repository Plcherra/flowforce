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

- [x] Replace generic metrics with operator-critical cards.
- [x] Add labor, inventory, task, schedule, and risk summaries.
- [x] Add action-first manager widgets.
- [x] Add mobile-responsive dashboard layout.

Acceptance:

- Dashboard answers "what needs attention today?"

Verification:

- Dashboard loads with real tenant data and no console schema errors.

Status:

- Completed on 2026-05-28.
- Phase report: [04.02 Dashboard Command Center](./reports/04-02-dashboard-command-center-2026-05-28.md)

### Phase 3: Employees And HR Completion

- [x] Finish employee profiles, roles, departments, availability, certifications, and performance links.
- [x] Remove remaining demo-only HR data.
- [x] Add manager actions and staff self-service states.
- [x] Add empty/import states.

Acceptance:

- A customer can operate basic staff management.

Verification:

- Employee module smoke and permission tests pass.

Status:

- Completed on 2026-05-28.
- Phase report: [04.03 Employees And HR Completion](./reports/04-03-employees-and-hr-completion-2026-05-28.md)

### Phase 4: Scheduling Completion

- [x] Finish shift creation, assignment, availability, time off, and schedule views.
- [x] Add schedule conflict warnings.
- [x] Add manager approval flows.
- [x] Prepare schedule data for cost engine.

Acceptance:

- A manager can build and review a schedule.

Verification:

- Scheduling smoke and tenant tests pass.

Status:

- Completed on 2026-05-28.
- Phase report: [04.04 Scheduling Completion](./reports/04-04-scheduling-completion-2026-05-28.md)

### Phase 5: Tasks And Goals Completion

- [x] Finish task CRUD, comments, assignment, reminders, and status workflows.
- [x] Connect tasks to forms, operations, inventory, and AI suggestions.
- [x] Add recurring task support where needed.
- [x] Polish staff mobile/tablet task experience.

Acceptance:

- Tasks become a real execution layer.

Verification:

- Task workflows pass web and mobile viewport checks.

Status:

- Completed on 2026-05-28.
- Phase report: [04.05 Tasks And Goals Completion](./reports/04-05-tasks-and-goals-completion-2026-05-28.md)

### Phase 6: Messages And Company Updates Completion

- [x] Finish channels, direct messages, reactions, reads, and attachments.
- [x] Finish announcements/company updates publishing.
- [x] Add notification hooks.
- [x] Ensure storage privacy and signed URLs remain correct.

Acceptance:

- Teams can communicate without leaving FlowForce.

Verification:

- Messaging smoke and storage privacy tests pass.

Status:

- Completed on 2026-05-28.
- Phase report: [04.06 Messages And Company Updates Completion](./reports/04-06-messages-and-company-updates-completion-2026-05-28.md)

### Phase 7: Forms And Sections Completion

- [x] Finish form builder, submissions, review, files, ratings, signatures, scans, and locations.
- [x] Connect forms to operations workflows.
- [x] Add template-based forms for restaurant/retail.
- [x] Add manager review queue.

Acceptance:

- Forms support Jolt-style execution basics.

Verification:

- Form storage and tenant tests pass.

Status:

- Completed on 2026-05-28.
- Phase report: [04.07 Forms And Sections Completion](./reports/04-07-forms-and-sections-completion-2026-05-28.md)

### Phase 8: Analytics And Reports Completion

- [x] Replace placeholder analytics with real module summaries.
- [x] Add exportable reports.
- [x] Add owner and manager report views.
- [x] Connect reports to cost engine and AI insights.

Acceptance:

- Reports answer real operator questions.

Verification:

- Analytics route loads without fake-only values.

Status:

- Completed on 2026-05-28.
- Phase report: [04.08 Analytics And Reports Completion](./reports/04-08-analytics-and-reports-completion-2026-05-28.md)

### Phase 9: Settings And Admin Completion

- [x] Finish company settings, permissions, integrations shell, feature flags, and admin tools.
- [x] Add configuration completeness indicators.
- [x] Add safe dangerous-action flows.
- [x] Add audit links.

Acceptance:

- Admins can configure the workspace without developer help.

Verification:

- Settings changes persist and respect permissions.

Status:

- Completed on 2026-05-28.
- Phase report: [04.09 Settings And Admin Completion](./reports/04-09-settings-and-admin-completion-2026-05-28.md)

### Phase 10: Web App Production QA

- [x] Run full route smoke.
- [x] Run mobile and desktop viewport QA.
- [x] Fix text overflow, layout shifts, loading loops, and console errors.
- [x] Update launch checklist.

Acceptance:

- Web app is ready for pilot customers.

Verification:

- Build, typecheck, smoke, Supabase gates, and release gates pass.

Status:

- Completed on 2026-05-28.
- Phase report: [04.10 Web App Production QA](./reports/04-10-web-app-production-qa-2026-05-28.md)
