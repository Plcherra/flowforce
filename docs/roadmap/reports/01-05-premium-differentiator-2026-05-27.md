# Phase 01.05 - Premium Differentiator

Date: 2026-05-27

## Decision

FlowForce's premium differentiator is the connected restaurant cost and execution engine.

The product should not compete only by having more modules. It should compete by making those modules share context:

- Scheduling knows labor cost and staffing needs.
- Inventory knows what is on hand, what is needed, what was wasted, and what was purchased.
- Operations workflows know what was completed, missed, failed, and escalated.
- Dashboards combine the above into manager and owner decisions.
- AI explains the risk and proposes next actions with evidence.

## Main Moat

> FlowForce's moat is the connected restaurant cost and execution engine: schedules, labor assumptions, inventory counts, recipes, purchasing, waste, production, tasks, and checklists all feed the same operational picture.

## What Connected Operations Means

Connected operations means:

- A schedule can estimate labor cost and upcoming prep/inventory needs.
- Inventory counts can trigger purchasing, prep, waste review, and manager tasks.
- Waste can be tied to item, location, shift, recipe/production, and cost impact.
- Checklists can create follow-up tasks, exceptions, compliance history, and manager review.
- Dashboards can show labor, inventory, purchasing, waste, and execution together instead of as separate reports.

## Premium Dashboards

These dashboards are the clearest product proof:

### Shift Profitability Preview

Shows planned labor, expected prep/inventory cost, likely waste risk, checklist readiness, and staffing warnings before the shift happens.

### Daily Operator Briefing

Shows staffing gaps, low-stock items, overdue checklists, unresolved tasks, approvals, and manager risks for the day.

### Waste Impact Board

Shows waste cost by item, location, shift, reason, and trend, with suggested corrective tasks.

### Prep And Purchasing Planner

Shows upcoming schedules, par levels, counts, supplier needs, production/prep items, and suggested purchase orders.

### Execution Quality Board

Shows checklist completion, failed steps, recurring issues, manager review backlog, and follow-through.

## Minimum AI Role

AI should support the differentiator by:

- Explaining why something is risky.
- Citing records and metrics used for each recommendation.
- Suggesting manager actions.
- Drafting tasks, schedule changes, purchase suggestions, or workflow follow-ups.
- Waiting for manager approval before executing writes.

AI should not be sold as fully autonomous in v1.

## Product Implications

Prioritize:

- Cross-module data views.
- Cost calculations.
- Risk explanations.
- Manager approval flows.
- Evidence-linked AI recommendations.

Deprioritize:

- Isolated module polish that does not support the connected story.
- AI chat that cannot act on operational context.
- Large integration promises before internal cost/execution data is reliable.

## Acceptance Result

- Inventory + scheduling + cost engine defined as the main moat.
- Connected operations defined in measurable terms.
- Premium dashboards listed.
- Minimum AI role defined.

## Next Phase

Continue to Phase 01.06: pricing and packaging hypothesis.
