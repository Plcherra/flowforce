# 01 Product Positioning And Scope

## Goal

Define exactly what FlowForce is, who it is for, why it beats the multi-app stack, and what must be true before the product is sold as a serious SaaS platform.

## Phases

### Phase 1: Choose The Beachhead Market

- [x] Choose the first target vertical: restaurant, hospitality, retail, or field-service operations.
- [x] Define the buyer: owner, operator, GM, district manager, or franchise group.
- [x] Define the first daily user personas: manager, staff, admin, owner.
- [x] List the top 5 painful workflows they currently solve with multiple tools.

Decision:

- Primary beachhead: independent and small multi-location restaurants/food-service operators.
- Secondary later expansion: hospitality, retail, and field-service operations after the restaurant operating model is proven.

Buyer:

- Primary buyer: owner/operator for independent restaurants and small groups.
- Secondary buyers: general manager, district manager, franchise operator, or operations director.

Daily users:

- Owner/operator: wants profit, control, lower software cost, fewer blind spots.
- General manager: runs schedule, labor, inventory, tasks, and daily execution.
- Shift lead: completes checklists, assigns tasks, handles exceptions, reports issues.
- Staff: views schedule, messages, tasks, training, forms, and simple self-service.
- Admin/bookkeeper: handles setup, expenses, purchasing, payroll/accounting exports, and permissions.

Top workflows to win first:

- Scheduling and labor planning now separated from inventory, prep, and demand.
- Inventory counts, purchasing, waste, and production now separated from staff execution.
- Opening/closing/checklist compliance now separated from tasks and manager review.
- Team communication and announcements now separated from tasks, schedule changes, and approvals.
- Owner reporting now manually stitched from scheduling, inventory, payroll, accounting, and spreadsheets.

Acceptance:

- One primary vertical is selected.
- The product is not positioned as a generic tool for everyone.

Verification:

- Roadmap language and navigation priorities match the chosen vertical.

Status:

- Completed on 2026-05-27.
- Phase report: [01.01 Beachhead Market](./reports/01-01-beachhead-market-2026-05-27.md)

### Phase 2: Define The Replacement Stack

- [x] Document what FlowForce replaces from Jolt.
- [x] Document what FlowForce replaces from frontline workforce tools.
- [x] Document what FlowForce replaces from MarketMan.
- [x] Document what FlowForce should not replace in v1.

Replacement stack definition:

- Jolt replacement target: restaurant operations execution, checklists/SOPs, food-safety style workflows, task follow-through, manager review, and compliance reporting.
- Frontline workforce replacement target: employee scheduling, tasks, communication, updates, forms, HR/training basics, availability, permissions, and team execution.
- MarketMan replacement target: restaurant inventory items, units, counts, suppliers, purchasing, recipes/production, waste, COGS-style reporting, and food-cost visibility.

FlowForce v1 should not claim:

- Full remote sensor/hardware replacement for Jolt temperature sensors or label-printing devices.
- Full time-clock/payroll platform parity until clock-in, payroll export, labor-law rules, and payroll integrations are implemented and tested.
- Full MarketMan distributor/POS/accounting integration parity until integrations are live, monitored, and documented.
- Enterprise multi-region/franchise analytics parity until multi-location reporting and permission models are proven.

FlowForce's honest v1 advantage:

- One tenant-safe restaurant operations workspace where scheduling, tasks, forms, inventory, purchasing, waste, production, and cost dashboards can talk to each other.
- The first premium claim should be connected operational visibility, not feature-for-feature replacement of every mature competitor capability.

Acceptance:

- The comparison is honest and feature-specific.
- Unsupported competitor claims are removed or marked future.

Verification:

- Sales pages and internal docs use the same replacement story.

Status:

- Completed on 2026-05-27.
- Phase report: [01.02 Replacement Stack](./reports/01-02-replacement-stack-2026-05-27.md)

### Phase 3: Write The Core Product Promise

- [x] Create one short positioning statement.
- [x] Create one owner-facing ROI statement.
- [x] Create one manager-facing workflow statement.
- [x] Create one staff-facing simplicity statement.

Core positioning statement:

> FlowForce is the restaurant operations command center that connects staff scheduling, daily execution, inventory, purchasing, waste, cost visibility, and AI recommendations in one workspace.

Owner-facing ROI statement:

> Replace disconnected workforce, checklist, and inventory tools with one system that shows what each shift costs, where waste is happening, what needs attention today, and how to protect margin before small problems become expensive.

Manager-facing workflow statement:

> Build the schedule, run opening and closing, assign tasks, track counts and waste, review exceptions, and see the day's risks from one manager dashboard instead of jumping between apps and spreadsheets.

Staff-facing simplicity statement:

> Staff get one place to see their schedule, messages, tasks, checklists, training, and shift updates, with fewer logins and clearer expectations.

Short version for UI:

> One connected command center for restaurant labor, inventory, execution, and cost.

Homepage headline option:

> Run the shift. Control the cost. See the whole operation.

Homepage supporting copy option:

> FlowForce brings scheduling, tasks, checklists, inventory, purchasing, waste, and AI-powered operations insight into one workspace for restaurant teams.

Acceptance:

- A non-technical business owner can understand the value in under 30 seconds.

Verification:

- The homepage, onboarding, and dashboard copy can reuse the promise.

Status:

- Completed on 2026-05-27.
- Phase report: [01.03 Core Product Promise](./reports/01-03-core-product-promise-2026-05-27.md)

### Phase 4: Define The MVP Paid Pilot Scope

- [x] List modules required for a paid pilot.
- [x] List modules that can remain hidden or beta.
- [x] Define the minimum data needed for a restaurant/retail pilot.
- [x] Define pilot success metrics.

Required paid pilot modules:

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

Hidden or beta for v1:

- Broad marketplace/integration ecosystem.
- Full POS/distributor/accounting/payroll sync.
- Full time clock, GPS/geofencing, and payroll replacement.
- Full native/offline app beyond the chosen mobile pilot path.
- Advanced gamification, broad learning marketplace, and deep performance management.
- Enterprise franchise/global multi-region analytics.
- Fully autonomous AI writes without manager approval.

Minimum pilot data:

- Company profile, locations, timezone, currency, departments, roles, and permissions.
- Employee roster with roles, departments, rates or labor-cost assumptions, and availability.
- One to two weeks of schedule data.
- Inventory categories, items, units, suppliers, locations, par levels, and costs.
- Opening/closing/checklist templates.
- Initial counts, purchases, waste events, production/prep items, and basic expenses.
- Seeded tasks, messages/updates, and operational reports for demo/pilot onboarding.

Pilot success metrics:

- A manager can run one operating week from FlowForce.
- Staff can see schedule, tasks, messages, and checklists from mobile/web.
- Inventory counts and waste can be recorded without spreadsheets.
- Owner can see at least one combined labor + inventory + waste/cost dashboard.
- Onboarding a restaurant tenant requires no developer intervention.
- Visible production modules load without schema/RLS errors.
- Pilot users report fewer manual cross-app/spreadsheet handoffs.

Acceptance:

- There is a clear v1 boundary.
- Nice-to-have modules do not block shipment.

Verification:

- Feature flags or navigation rules can hide non-pilot modules.

Status:

- Completed on 2026-05-27.
- Phase report: [01.04 MVP Paid Pilot Scope](./reports/01-04-mvp-paid-pilot-scope-2026-05-27.md)

### Phase 5: Define The Premium Differentiator

- [x] Specify the inventory + scheduling + cost engine as the main moat.
- [x] Define what "connected operations" means in measurable terms.
- [x] List dashboards that competitors cannot easily provide.
- [x] Define the minimum AI role in the differentiator.

Premium differentiator:

> FlowForce's moat is the connected restaurant cost and execution engine: schedules, labor assumptions, inventory counts, recipes, purchasing, waste, production, tasks, and checklists all feed the same operational picture.

Connected operations means:

- A schedule can estimate labor cost and upcoming prep/inventory needs.
- Inventory counts can trigger purchasing, prep, waste review, and manager tasks.
- Waste can be tied to item, location, shift, recipe/production, and cost impact.
- Checklists can create follow-up tasks, exceptions, compliance history, and manager review.
- Dashboards can show labor, inventory, purchasing, waste, and execution together instead of as separate reports.

Dashboards competitors cannot easily provide as one system:

- Shift profitability preview: planned labor + expected inventory/prep cost + risk warnings.
- Daily operator briefing: staffing gaps + low stock + overdue checklists + unresolved tasks.
- Waste impact board: waste cost by item/location/shift plus corrective actions.
- Prep and purchasing planner: upcoming schedules + par levels + counts + suggested orders.
- Execution quality board: checklist completion + failed steps + recurring issues + manager follow-through.

Minimum AI role:

- AI should explain risks and recommend actions using evidence from FlowForce data.
- AI may create suggested tasks/orders/schedule changes only after manager approval.
- AI should not be positioned as fully autonomous in v1.

Acceptance:

- FlowForce is not sold as "more modules"; it is sold as connected decisions.

Verification:

- Dashboard and inventory roadmap phases prioritize cross-module insight.

Status:

- Completed on 2026-05-27.
- Phase report: [01.05 Premium Differentiator](./reports/01-05-premium-differentiator-2026-05-27.md)

### Phase 6: Pricing And Packaging Hypothesis

- [x] Define Starter, Operations, and Pro package concepts.
- [x] Decide which modules are core versus premium.
- [x] Decide whether pricing is per location, per employee, or hybrid.
- [x] Define expected savings versus 3-app stack.

Pricing hypothesis:

- Use location-based base pricing with employee bands.
- Avoid pure per-seat pricing for restaurants because staff count fluctuates and can make adoption feel punitive.
- Keep pricing simple enough for independent operators, but expandable for multi-location groups.

Package concepts:

- Starter: staff hub and daily execution basics.
- Operations: connected scheduling, forms/checklists, inventory, purchasing, waste, and manager dashboards.
- Pro: cost engine, AI recommendations, advanced reports, integrations, migration support, and multi-location controls.

Core modules:

- Onboarding, company setup, profiles, employees, roles, settings.
- Scheduling basics, tasks, messages/updates, forms/checklists.
- Inventory setup, counts, purchasing basics, waste basics.
- Basic dashboard and pilot reports.

Premium modules:

- Inventory + scheduling + cost engine.
- Shift profitability, prep/purchasing planner, waste impact, and execution quality dashboards.
- AI recommendations with evidence and manager approval.
- Advanced integrations and migration tooling.
- Multi-location reporting and admin controls.

Working price bands for research, not final:

- Starter: low-friction entry for one location.
- Operations: primary paid pilot package.
- Pro: premium package for serious operators and small groups.

Expected savings story:

- The value claim should focus on replacing operational fragmentation, not only software cost.
- Savings should include fewer tools, fewer manual handoffs, less waste, better labor planning, and faster manager follow-through.

Acceptance:

- Pricing supports the replacement-stack story.

Verification:

- Pricing page and billing-readiness work have a stable direction.

Status:

- Completed on 2026-05-27.
- Phase report: [01.06 Pricing And Packaging Hypothesis](./reports/01-06-pricing-and-packaging-hypothesis-2026-05-27.md)

### Phase 7: Module Visibility Rules

- [x] Decide which modules appear for staff, managers, admins, and owners.
- [x] Decide which modules are hidden until configured.
- [x] Decide beta labels for unfinished modules.
- [x] Align visible navigation with pilot scope.

Pilot visibility model:

- Staff: schedule, my availability/time off, tasks, messages, company updates, assigned checklists/forms, learning/training basics, profile.
- Shift lead: staff modules plus daily operations board, checklist runs, task assignment, issue reporting, inventory counts/waste capture where permitted.
- Manager: dashboard, team, scheduling, tasks, messages/updates, forms/checklists, inventory, purchasing, waste, reports, approvals, manager settings.
- Owner/operator: dashboard, cost overview, analytics/reports, team, scheduling, inventory/purchasing/waste, operations quality, settings, billing/admin.
- Admin/bookkeeper: setup, roles/permissions, settings, employees, expenses, purchasing, reports, integrations shell when enabled.

Hidden until configured:

- Inventory should stay hidden until at least one location, unit, category, and item exist.
- Purchasing should stay hidden until suppliers and items exist.
- Cookbook/production should stay hidden until items and units exist.
- Advanced reports should stay hidden until enough schedule/inventory/task data exists.
- Integrations should stay hidden or setup-only until provider credentials and sync scope exist.

Beta or internal-only labels:

- AI insights and operations intelligence until evidence-linked recommendations are reliable.
- Performance, recognition, leaderboard, certifications, and broad learning modules unless needed for a specific pilot.
- Help desk, resources, goals, meetings, permission demo, add section, and custom sections unless explicitly configured.
- Full accounting/payroll/time-clock surfaces until they are supported by real workflows.

Navigation alignment:

- The pilot sidebar should favor Dashboard, Schedule, Tasks, Messages/Updates, Checklists/Forms, Inventory, Purchasing/Waste, Reports, Team, and Settings.
- Secondary or unfinished modules should not appear by default for pilot tenants.

Acceptance:

- Users do not see broken or irrelevant modules.

Verification:

- Smoke tests cover only visible production modules and beta routes intentionally.

Status:

- Completed on 2026-05-27.
- Phase report: [01.07 Module Visibility Rules](./reports/01-07-module-visibility-rules-2026-05-27.md)

### Phase 8: Sales Narrative And Demo Script

- [x] Write a 10-minute demo flow.
- [x] Include onboarding, scheduling, inventory, cost dashboard, workflows, and AI insight.
- [x] Define required demo seed data.
- [x] Define screenshots or video moments.

Demo narrative:

> FlowForce shows a restaurant operator what is happening today, what it will cost, what is at risk, and what actions managers should approve before the shift gets expensive.

10-minute demo flow:

1. Daily operator briefing: open on the dashboard with today's labor, checklist, stock, waste, and task risks.
2. Restaurant setup: show the configured tenant, location, departments, roles, and pilot-ready settings.
3. Team and schedule: show employees, availability/time off, a schedule gap, and estimated labor impact.
4. Daily execution: show opening/closing checklists, assigned tasks, overdue items, and manager follow-up.
5. Inventory and purchasing: show counts, low-stock items, suppliers, suggested purchase needs, and one waste event.
6. Cost visibility: show labor, purchasing, inventory, and waste impact in the cost dashboard.
7. AI insight: show an evidence-linked recommendation that suggests a task, purchase, or schedule correction for manager approval.
8. Owner report: show the weekly picture with labor, inventory, waste, checklist completion, and unresolved exceptions.
9. Mobile staff view: show a staff member checking schedule, messages, tasks, and assigned checklist work.

Required demo seed data:

- One restaurant tenant with company profile, location, timezone, currency, departments, roles, and permissions.
- Five to ten employees with roles, departments, hourly rates or labor-cost assumptions, availability, and one time-off request.
- One week of schedule data with at least one coverage gap and one manager correction.
- Opening, closing, cleaning, and food-safety checklist templates with sample completed and failed items.
- Inventory locations, categories, units, items, suppliers, par levels, item costs, and one purchase order.
- One inventory count, one low-stock item, one adjustment, one production/prep item, and one waste event.
- Tasks, reminders, messages/company updates, and manager approvals connected to the above events.
- Dashboard/report metrics that make the labor + inventory + waste + execution story visible without manual setup.

Screenshots or video moments:

- Dashboard daily briefing with risk cards.
- Schedule view showing a labor or coverage issue.
- Checklist run with failed item and follow-up task.
- Inventory count, low-stock item, purchase need, and waste capture.
- Cost dashboard showing labor, purchasing, inventory, and waste together.
- AI recommendation with cited evidence and an approval action.
- Owner report with weekly operating summary.
- Mobile/staff view for schedule, messages, tasks, and checklist work.

Demo readiness rule:

- The demo tenant must be seedable and resettable.
- The demo must not depend on live customer data.
- Every visible module in the demo must match the pilot navigation and role rules from Phase 01.07.

Acceptance:

- A demo can be repeated without improvising.

Verification:

- Demo tenant can be seeded and reset.

Status:

- Completed on 2026-05-27.
- Phase report: [01.08 Sales Narrative And Demo Script](./reports/01-08-sales-narrative-and-demo-script-2026-05-27.md)

### Phase 9: Customer Objection Map

- [x] List objections about switching from existing tools.
- [x] List objections about trust, uptime, security, and mobile.
- [x] List objections about integrations.
- [x] Map each objection to product proof.

Switching objections:

- "We already use separate tools and spreadsheets." Proof needed: migration checklist, demo tenant import, and side-by-side replacement map.
- "My managers will not adopt another system." Proof needed: focused pilot navigation, mobile staff view, and one-week manager workflow demo.
- "Setup sounds like too much work." Proof needed: guided onboarding, seeded templates, default roles, sample checklists, and inventory import path.
- "We cannot risk disrupting the restaurant." Proof needed: phased rollout plan that starts read-only or parallel before replacing live workflows.

Trust, uptime, security, and mobile objections:

- "Can I trust this with employee and business data?" Proof needed: tenant isolation tests, RLS audit, access-control documentation, and data retention/export policy.
- "What happens if the app is down during a shift?" Proof needed: uptime target, incident process, status page plan, backup/restore plan, and graceful mobile fallback.
- "Will staff use it on phones?" Proof needed: mobile-first staff flows for schedule, tasks, messages, and checklists, tested on real viewport sizes.
- "Will owners have control over permissions?" Proof needed: role matrix, permission tests, owner/admin settings, and audit history for sensitive actions.

Integration objections:

- "Will it connect to POS, payroll, accounting, or suppliers?" Proof needed: honest integration roadmap, export-first fallback, and provider priority list.
- "Can we start without every integration?" Proof needed: manual import/export flows, CSV templates, and a pilot workflow that does not require deep integrations.
- "What if we leave later?" Proof needed: data export policy and downloadable records for employees, schedules, tasks, inventory, purchasing, waste, and reports.

Objection-to-proof rule:

- Every launch claim must map to product evidence, demo evidence, documentation, or an explicit future roadmap item.
- Sales language should never imply a replacement that is not visible, tested, or documented.

Acceptance:

- Common buyer resistance has a concrete answer.

Verification:

- Launch checklist includes proof for security, mobile, integrations, and support.

Status:

- Completed on 2026-05-27.
- Phase report: [01.09 Customer Objection Map](./reports/01-09-customer-objection-map-2026-05-27.md)

### Phase 10: Positioning Freeze For Build

- [x] Freeze v1 positioning for one execution cycle.
- [x] Move deferred ideas to future roadmap.
- [x] Confirm every later plan supports the same product story.
- [x] Update the master roadmap status.

Frozen v1 positioning:

> FlowForce is the restaurant operations command center for independent and small multi-location food-service operators, connecting staff scheduling, daily execution, inventory, purchasing, waste, cost visibility, and AI-assisted recommendations in one tenant-safe workspace.

Frozen v1 buyer:

- Primary buyer: owner/operator.
- Secondary buyers: general manager, district manager, franchise operator, and operations director.
- Daily users: owner/operator, manager, shift lead, staff, and admin/bookkeeper.

Frozen v1 build priority:

1. Make the current SaaS foundation reliable: onboarding, tenant safety, roles, permissions, settings, auditability, and recoverability.
2. Complete the pilot web app around dashboard, schedule, tasks, messages/updates, checklists/forms, inventory, purchasing/waste, reports, team, and settings.
3. Build the connected inventory + scheduling + cost engine as the premium differentiator.
4. Add AI as evidence-linked recommendations with manager approval, not autonomous operations.
5. Ship mobile through the lowest-risk path after the web/PWA core is stable.
6. Add integrations after import/export and pilot workflows prove value without them.

Deferred ideas:

- Enterprise franchise/global analytics.
- Full POS, distributor, payroll, accounting, and marketplace integration parity.
- Full time-clock/payroll replacement.
- Deep native/offline app features beyond the selected mobile v1 path.
- Autonomous AI writes without approval and audit history.
- Broad performance, recognition, learning marketplace, help desk, goals, meetings, and custom-section expansion unless required by a specific pilot.

Build alignment:

- Phase 02 supports the frozen story by deciding architecture before large restructuring.
- Phase 03 supports the frozen story by hardening tenant, onboarding, permission, audit, billing, and data safety foundations.
- Phase 04 supports the frozen story by completing the visible web app modules needed for pilots.
- Phase 05 supports the frozen story by building the cost engine moat.
- Phase 06 supports the frozen story by strengthening operational workflows and compliance.
- Phase 07 supports the frozen story by adding AI recommendations with approvals and auditability.
- Phase 08 supports the frozen story by creating a real mobile path for managers and staff.
- Phase 09 supports the frozen story by adding integrations after the product loop is proven.
- Phase 10 supports the frozen story by making deployment, monitoring, backup, release, and launch operations production-ready.

Acceptance:

- Build phases no longer chase changing product identity.

Verification:

- Product, architecture, and launch docs all agree.

Status:

- Completed on 2026-05-27.
- Phase report: [01.10 Positioning Freeze For Build](./reports/01-10-positioning-freeze-for-build-2026-05-27.md)
