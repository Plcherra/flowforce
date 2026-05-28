# Scheduling Completion

Date: 2026-05-28

Purpose: define the pilot-ready scheduling surface for the authenticated web app.

## Product Rule

The scheduling module must let a manager build and review a weekly schedule from real tenant data:

- Create draft shifts without injected demo labor rates.
- Assign employees to shifts.
- Review time off, unavailability, and overlapping assignments before publish.
- See unassigned and understaffed shifts.
- Understand labor hours and estimated labor cost readiness.
- Keep vendor visits linked to real shifts without demo labels.

## Primary Surface

The scheduling command surface now includes a schedule readiness panel with these signals:

- Draft and published shift count.
- Assignment gaps.
- Conflict warnings.
- Scheduled labor hours.
- Estimated labor cost and missing-rate count.

Managers can jump from the panel to availability and time-off workflows before publishing.

## Conflict Rules

The scheduling readiness utility evaluates:

- Assigned users with approved or pending time off during a shift window.
- Assigned users with unavailability overlapping a shift window.
- Assigned users double-booked across overlapping shifts.
- Shifts below required headcount.

Blocking conflicts are separated from general readiness warnings so the UI can guide manager review without hiding the schedule.

## Cost Readiness

Shift creation and editing now support an explicit hourly rate field. If no rate is provided, the app stores `null` and reports missing labor cost readiness instead of assuming a fake rate.

## Deferred

Later phases should add:

- Full schedule approval history and manager sign-off records.
- Staff acknowledgement and notification workflows.
- Overtime, break compliance, and minor-hour rules.
- Schedule templates backed by tenant settings.
- Deeper labor forecasting once the cost engine is active.
