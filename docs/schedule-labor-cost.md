# Schedule Labor Cost

Date: 2026-05-28

Plan: 05 Inventory Finance Cost Engine

Phase: 05.07 Labor And Schedule Cost

## Purpose

Schedule labor cost turns published and draft shifts into an estimated labor cost input for dashboards, reports, and the later shift profitability layer. This is not a payroll replacement yet. It is the planned labor model that lets FlowForce answer what a schedule is expected to cost before the shift happens.

## Inputs

- `schedules.company_id` is the tenant boundary.
- `schedules.start_time` and `schedules.end_time` define gross shift duration.
- `schedules.break_minutes` is treated as unpaid break time.
- `schedules.required_headcount` defines planned staffing. If it is missing, assigned headcount or one person is used as the estimate floor.
- `schedules.hourly_rate` is the preferred pay-rate estimate.
- `schedules.requirements` can carry fallback estimate keys: `hourly_rate`, `estimated_hourly_rate`, `labor_rate`, `estimated_labor_rate`, or `pay_rate`.
- `schedules.role`, `schedules.location`, and `schedules.position_id` power breakdowns.
- `positions.department_id` powers department grouping when a shift has a position.

## Formula

```text
gross_shift_hours = max(end_time - start_time, 0)
net_shift_hours = max(gross_shift_hours - break_minutes / 60, 0)
planned_headcount = max(required_headcount, assigned_headcount, user_id fallback, 1)
planned_labor_hours = net_shift_hours * planned_headcount
planned_labor_cost = planned_labor_hours * hourly_rate_estimate
```

Missing or non-positive hourly rate is not treated as free labor. The shift receives `cost_basis_status = missing_rate` and `planned_labor_cost = null`.

## Database Contract

`cost_schedule_labor_v` exposes one row per schedule with:

- shift identity and tenant fields
- date, location, role, position, and department
- planned headcount
- gross, net, and planned labor hours
- hourly rate estimate and source
- planned labor cost
- cost-basis status

`cost_schedule_labor_breakdown_v` aggregates the same data by company, date, location, role, position, and department.

`get_schedule_labor_cost(company_id, start_date, end_date)` returns tenant-scoped schedule cost rows for reports and future dashboard APIs.

## Actual Labor Import Path

`labor_entries` now has the first real import shape:

- user and schedule identifiers
- work date
- clock-in and clock-out timestamps
- paid and unpaid minutes
- regular and overtime hours
- hourly rate and labor cost
- source, status, and metadata

The table is RLS-protected and company-scoped. It is ready for payroll, time-clock, or CSV actual labor imports in later plans, but Plan 05.07 does not reconcile actual labor against schedule estimates yet.

## Product Behavior

- Today and future schedule cost reports can use the same estimate formula.
- Draft schedules can be priced before publication.
- Missing pay-rate shifts stay visible as setup gaps.
- Labor can be grouped by role, department, location, and date.

## Follow-Up

- Plan 05.08 should combine this labor estimate with production, waste, purchasing, expenses, and inventory movement.
- A future payroll/import phase should map imported actual labor to `labor_entries` and reconcile variance against scheduled labor.
