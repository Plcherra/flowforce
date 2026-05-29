# Phase 01.08 - Sales Narrative And Demo Script

Date: 2026-05-27

## Decision

The first serious FlowForce demo should sell one connected restaurant operating loop, not a tour of every module.

The demo should prove this sentence:

> FlowForce shows a restaurant operator what is happening today, what it will cost, what is at risk, and what actions managers should approve before the shift gets expensive.

## 10-Minute Demo Flow

1. Daily operator briefing, 0:00-1:00
   - Open on the dashboard.
   - Show today's labor, checklist, stock, waste, and task risks.
   - Message: the owner or manager starts with one operating picture.

2. Restaurant setup, 1:00-1:45
   - Show the configured tenant, location, departments, roles, and permissions.
   - Message: this is a real restaurant workspace, not a generic admin template.

3. Team and schedule, 1:45-2:45
   - Show employees, availability/time off, a schedule gap, and estimated labor impact.
   - Message: labor planning is connected to daily execution and cost.

4. Daily execution, 2:45-4:00
   - Show opening/closing checklists, assigned tasks, overdue work, and manager follow-up.
   - Message: managers can see whether the operation is actually being done.

5. Inventory and purchasing, 4:00-5:45
   - Show counts, low-stock items, suppliers, suggested purchase needs, and one waste event.
   - Message: inventory work is connected to purchasing, waste, and management action.

6. Cost visibility, 5:45-7:00
   - Show labor, purchasing, inventory, production, waste, and approval impact in the cost dashboard.
   - Message: FlowForce turns daily execution into cost awareness.

7. AI insight, 7:00-8:15
   - Show an evidence-linked recommendation.
   - The recommendation may suggest a task, purchase, or schedule correction.
   - Message: AI supports the manager with traceable evidence and approval, rather than silently changing operations.

8. Owner report, 8:15-9:15
   - Show the weekly picture with actual revenue/cost, imported cost, estimated operating cost, pending approvals, labor, inventory, waste, checklist completion, and unresolved exceptions.
   - Message: the owner no longer needs to stitch together separate tools and spreadsheets.

9. Mobile staff view, 9:15-10:00
   - Show a staff member checking schedule, messages, tasks, and assigned checklist work.
   - Message: staff get one simple place to know what to do.

## Required Demo Seed Data

- One restaurant tenant with profile, location, timezone, currency, departments, roles, and permissions.
- Five to ten employees with roles, departments, hourly rates or labor-cost assumptions, availability, and one time-off request.
- One week of schedule data with at least one coverage gap and one manager correction.
- Opening, closing, cleaning, and food-safety checklist templates.
- Sample completed checklist work and at least one failed checklist item.
- Inventory locations, categories, units, items, suppliers, par levels, and item costs.
- One inventory count, one low-stock item, one adjustment, one production/prep item, and one waste event.
- One purchase order or suggested purchase need.
- Tasks, reminders, messages, company updates, and manager approvals connected to demo events.
- Dashboard and report metrics that show labor, inventory, waste, purchasing, and execution without manual setup.
- Source-labeled financial records for actual/manual, imported, estimated, pending, and sample/demo data so the owner overview proves production actuals are not polluted by demo records.

## Required Screenshot Or Video Moments

- Dashboard daily briefing with risk cards.
- Schedule view showing a labor or coverage issue.
- Checklist run with a failed item and follow-up task.
- Inventory count, low-stock item, purchase need, and waste capture.
- Cost dashboard showing labor, purchasing, inventory, production, waste, and approval queues together.
- AI recommendation with cited evidence and approval action.
- Owner report with actual, imported, estimated, and pending approval totals separated.
- Mobile/staff view for schedule, messages, tasks, and checklist work.

## Product Implication

Later build phases should create a seeded demo tenant and reset script before customer-facing demos become a sales dependency.

Plan 05.10 completed the cost-engine signoff and updated this demo flow to use the signed-off owner financial overview. Any seeded demo tenant must label sample records as `sample` and imported records as `imported`.

Plan 06.10 completed the operations workflow signoff and added `install_operations_workflow_demo(company_id)`. The demo can now seed opening, closing, cleaning, and food-safety workflows with sample-labeled runs, evidence, review queue items, exceptions, automation hooks, and execution quality analytics.

The demo must also enforce the visibility rules from Phase 01.07:

- Staff should only see staff-facing work.
- Managers should see execution, schedule, inventory, purchasing, waste, reports, and approvals.
- Owners should see cost and operating summary views.
- Beta/internal modules should not appear during the primary demo.

## Acceptance Result

- 10-minute demo flow defined.
- Onboarding, scheduling, inventory, cost dashboard, workflows, and AI insight included.
- Required seed data defined.
- Screenshot/video moments defined.

## Next Phase

Continue to Phase 01.09: customer objection map.
