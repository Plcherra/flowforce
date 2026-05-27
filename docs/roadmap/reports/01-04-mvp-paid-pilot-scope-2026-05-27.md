# Phase 01.04 - MVP Paid Pilot Scope

Date: 2026-05-27

## Decision

The MVP paid pilot should prove FlowForce as a restaurant operations command center, not as a finished replacement for every mature competitor feature.

The pilot should focus on one realistic operating loop:

1. Set up the restaurant.
2. Add the team.
3. Build the schedule.
4. Run daily tasks/checklists.
5. Track inventory, purchasing, production, and waste.
6. Show owner/manager dashboards that combine labor, inventory, waste, and execution.

## Required Paid Pilot Modules

- Onboarding, company setup, profile, roles, permissions, and settings.
- Dashboard command center.
- Employees and departments.
- Scheduling, availability, and time-off basics.
- Tasks, reminders, and manager follow-up.
- Company updates and team communication basics.
- Forms/checklists for opening, closing, cleaning, food safety, and manager review.
- Inventory setup: items, units, categories, locations, suppliers.
- Inventory counts, adjustments, waste, purchasing, recipes/production basics.
- Financial/cost overview focused on labor, inventory, purchasing, waste, and estimated shift cost.
- Reports/analytics limited to pilot-critical operational views.

## Hidden Or Beta For V1

These should not block the paid pilot:

- Broad marketplace/integration ecosystem.
- Full POS/distributor/accounting/payroll sync.
- Full time clock, GPS/geofencing, and payroll replacement.
- Full native/offline app beyond the chosen mobile pilot path.
- Advanced gamification, broad learning marketplace, and deep performance management.
- Enterprise franchise/global multi-region analytics.
- Fully autonomous AI writes without manager approval.

## Minimum Pilot Data

A pilot tenant needs:

- Company profile, locations, timezone, currency, departments, roles, and permissions.
- Employee roster with roles, departments, rates or labor-cost assumptions, and availability.
- One to two weeks of schedule data.
- Inventory categories, items, units, suppliers, locations, par levels, and costs.
- Opening/closing/checklist templates.
- Initial counts, purchases, waste events, production/prep items, and basic expenses.
- Seeded tasks, messages/updates, and operational reports for demo/pilot onboarding.

## Pilot Success Metrics

FlowForce is pilot-ready when:

- A manager can run one operating week from FlowForce.
- Staff can see schedule, tasks, messages, and checklists from mobile/web.
- Inventory counts and waste can be recorded without spreadsheets.
- Owner can see at least one combined labor + inventory + waste/cost dashboard.
- Onboarding a restaurant tenant requires no developer intervention.
- Visible production modules load without schema/RLS errors.
- Pilot users report fewer manual cross-app/spreadsheet handoffs.

## Product Implications

This scope means the next build phases should prioritize:

- Feature flags and navigation cleanup.
- Real-data readiness for required modules.
- A restaurant pilot seed/import flow.
- Cost dashboard connections.
- Mobile usability for staff and managers.

This scope means the next build phases should delay:

- Deep native mobile rebuild.
- Large marketplace integrations.
- Full payroll/time clock parity.
- Enterprise franchise reporting.
- Autonomous AI write actions.

## Acceptance Result

- Required pilot modules listed.
- Hidden/beta modules listed.
- Minimum pilot data listed.
- Pilot success metrics listed.

## Next Phase

Continue to Phase 01.05: define the premium differentiator.
