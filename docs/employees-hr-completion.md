# Employees And HR Completion

Date: 2026-05-28

Purpose: define the pilot-ready HR surface for the authenticated web app.

## Product Rule

The employees module must let a customer operate basic staff management without developer help:

- See the real tenant roster.
- Identify incomplete staff setup.
- Invite teammates.
- Review roles, access, departments, availability, certifications, and performance signals.
- Understand empty states instead of seeing blank tables.

## Primary Surface

The team directory now includes an HR readiness panel with these signals:

- Incomplete active profiles.
- Active teammates without departments.
- Active teammates without availability on file.
- Active teammates without active certifications.
- Active teammates below the reliability threshold.

Each signal links to the owning workflow: employees, availability, certifications, or performance.

## Data Sources

The employee module reads tenant data from:

- `profiles`
- `departments`
- `positions`
- `skill_matrix`
- `employee_badge`
- `employee_report`
- `staff_performance`
- `staff_availability`
- `employee_certifications`

Employee roster query failures now surface as directory errors instead of silently becoming an empty roster.

## Empty States

The directory has explicit states for:

- No teammates yet.
- Employee filters with no matching teammates.
- Vendors with no results.
- Vendor data unavailable.
- Company/profile context unavailable.

## Deferred

Later phases should add:

- Full profile editing and manager approval flows.
- Department creation from the directory.
- Certification assignment workflow inside the employee drawer.
- Staff self-service profile editing.
- Deeper performance review workflows.
