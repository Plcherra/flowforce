# Phase 01.07 - Module Visibility Rules

Date: 2026-05-27

## Decision

Pilot users should only see modules that are relevant to the restaurant operating loop and stable enough to support the product promise.

FlowForce can contain many modules internally, but the pilot experience should feel focused:

- Dashboard.
- Schedule.
- Tasks.
- Messages and company updates.
- Checklists/forms.
- Inventory.
- Purchasing and waste.
- Reports.
- Team.
- Settings.

## Role-Based Visibility

### Staff

Visible:

- Schedule.
- My availability and time off.
- Tasks.
- Messages.
- Company updates.
- Assigned checklists/forms.
- Learning/training basics.
- Profile.

Hidden by default:

- Owner analytics.
- Purchasing.
- Admin settings.
- Advanced inventory setup.
- Permissions.

### Shift Lead

Visible:

- Staff modules.
- Daily operations board.
- Checklist runs.
- Task assignment.
- Issue reporting.
- Inventory counts and waste capture when permitted.

Hidden by default:

- Billing/admin settings.
- Advanced analytics.
- Employee compensation/admin tools.

### Manager

Visible:

- Dashboard.
- Team.
- Scheduling.
- Tasks.
- Messages and company updates.
- Forms/checklists.
- Inventory.
- Purchasing.
- Waste.
- Reports.
- Approvals.
- Manager settings.

Hidden by default:

- Billing.
- Deep platform/admin configuration.
- Experimental AI automation writes.

### Owner/Operator

Visible:

- Dashboard.
- Cost overview.
- Analytics and reports.
- Team.
- Scheduling.
- Inventory, purchasing, production, and waste.
- Operations quality.
- Settings.
- Billing/admin when implemented.

Hidden by default:

- Staff-only execution views unless opened intentionally.
- Internal development/demo routes.

### Admin/Bookkeeper

Visible:

- Setup.
- Roles and permissions.
- Settings.
- Employees.
- Expenses.
- Purchasing.
- Reports.
- Integrations shell when enabled.

Hidden by default:

- Experimental operational AI.
- Irrelevant staff execution pages.

## Hidden Until Configured

- Inventory: hidden until at least one location, unit, category, and item exist.
- Purchasing: hidden until suppliers and items exist.
- Cookbook/production: hidden until items and units exist.
- Advanced reports: hidden until enough schedule/inventory/task data exists.
- Integrations: hidden or setup-only until provider credentials and sync scope exist.

## Beta Or Internal-Only

Keep behind beta/internal labels unless a pilot explicitly needs them:

- AI insights and operations intelligence.
- Performance.
- Recognition.
- Leaderboard.
- Certifications.
- Broad learning center.
- Help desk.
- Resources.
- Goals.
- Meetings.
- Permission demo.
- Add section/custom sections.
- Full accounting/payroll/time-clock.

## Pilot Sidebar Recommendation

Default pilot navigation:

1. Dashboard
2. Schedule
3. Tasks
4. Messages
5. Company Updates
6. Checklists / Forms
7. Inventory
8. Purchasing / Waste
9. Reports
10. Team
11. Settings

## Product Implication

Later implementation should add a module visibility layer backed by:

- Role/permission checks.
- Feature flags.
- Tenant setup completeness.
- Beta/internal labels.
- Smoke tests that follow the visible production navigation.

## Acceptance Result

- Role-based module visibility defined.
- Hidden-until-configured rules defined.
- Beta/internal modules identified.
- Pilot navigation aligned with paid pilot scope.

## Next Phase

Continue to Phase 01.08: sales narrative and demo script.
