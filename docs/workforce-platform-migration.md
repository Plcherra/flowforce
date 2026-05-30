# Workforce Platform Migration Path

Date: 2026-05-30
Roadmap phase: 09.03 Workforce Platform Migration Path

## Goal

FlowForce should give teams leaving a workforce management tool a clear path into the product without custom SQL, manual table edits, or vendor-specific engineering work.

09.03 builds on the generic CSV import framework from 09.02. It defines what workforce data can move, how exported columns map into FlowForce, and what the customer sees after the migration.

## Imported Data

The v1 workforce migration path covers:

- Employees: imported through the `employees` CSV template.
- Roles: derived from employee export rows and normalized into FlowForce product roles.
- Schedules: imported through the `schedules` CSV template.
- Tasks: imported through the `tasks` CSV template.
- Messages: retained as archive-only migration evidence when exported.

Message history should not be injected into live team chat by default. A clean cutover is safer than making historical provider conversations look like current FlowForce messages.

## Required Files

The customer migration packet should include:

- `employees.csv`
- `schedules.csv`
- `tasks.csv`

Optional:

- `messages.csv` or provider message export, stored as archive evidence.
- Role export, if the provider separates roles from employees.

## Mapping

The canonical adapter contract lives in `src/services/integrations/workforceMigrationPath.ts`.

Employee aliases:

- `First name`: First, Given name, Employee first name.
- `Last name`: Last, Surname, Employee last name.
- `Email`: Email address, Work email, Employee email.
- `Role`: Job role, Permission, Access level.
- `Department`: Team, Location group.
- `Phone`: Mobile, Phone number.

Schedule aliases:

- `Employee email`: Email, Staff email.
- `Shift date`: Date, Scheduled date.
- `Start time`: Starts, Clock in.
- `End time`: Ends, Clock out.
- `Role`: Position, Station.
- `Location`: Site, Store.

Task aliases:

- `Task title`: Task, Name.
- `Description`: Details, Instructions.
- `Assignee email`: Assigned to, Owner email.
- `Due date`: Deadline, Date.
- `Priority`: Urgency.

## Role Normalization

Provider roles are normalized before import review:

- Owner remains `owner`.
- Admin, administrator, and company admin become `admin`.
- Manager, supervisor, and lead become `manager`.
- Employee, staff, team member, and worker become `team_member`.
- Unknown roles default to `team_member` for safety and should be reviewed before invites are sent.

## Completion Report

The workforce migration completion report includes:

- Imported object counts for employees, roles, schedules, tasks, and messages.
- CSV preview summaries for employees, schedules, and tasks.
- Validation error count.
- Archive-only skipped objects.
- Next actions before customer cutover.

The report should be attached to the import batch or customer migration record in later UI work.

## Verification

09.03 is complete when:

- `npm run check:workforce-migration` passes.
- Sample workforce exports create valid FlowForce employee, schedule, and task previews.
- Roles are normalized.
- Message exports are handled as archive-only evidence.
