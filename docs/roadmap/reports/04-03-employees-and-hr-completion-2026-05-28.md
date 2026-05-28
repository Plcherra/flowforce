# 04.03 Employees And HR Completion

Date: 2026-05-28

## Status

Completed.

## What Changed

- Added an HR readiness panel to the team directory.
- Added real tenant-data checks for incomplete profiles, missing departments, missing availability, missing certifications, and low reliability.
- Added manager action links to invite staff, collect availability, and review certifications.
- Improved employee and vendor empty states for filtered and unconfigured directories.
- Made the employee table and drawer safe for incomplete profile names.
- Updated employee data loading so roster query failures surface as errors instead of silently showing an empty roster.
- Expanded employee drawer overview with department, skill, certification, and reliability context.

## Data Sources

The HR readiness surface reads:

- `profiles`
- `departments`
- `staff_availability`
- `employee_certifications`
- Existing employee enrichment from `skill_matrix`, `employee_badge`, `employee_report`, and `staff_performance`

## Acceptance Check

A customer can now operate basic staff management from the employee module:

- Invite staff.
- See roster and vendor contacts.
- Review active/inactive/leads.
- Identify missing setup before scheduling.
- Jump to availability, certifications, and performance workflows.
- Understand empty states without blank tables.

## Verification

- `npm run typecheck`
- `npm run check:local`
- `npm run build`
- `git diff --check`

## Follow-Up For Later Phases

- Add profile edit flows and department creation from the directory.
- Add certification assignment directly from the employee drawer.
- Add staff self-service editing once mobile/offline direction is finalized.
