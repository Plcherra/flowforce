Task ID: R03
Section: Operations
Category: [BUGFIX]
Priority: High

Description

Daily hours cards in `NextGenSchedulingSystem` parse ISO dates with `new Date(\`\${day}T00:00:00\`)`, which shifts to the prior day in negative timezones, so summaries display off-by-one dates.

Affected Areas

src/components/scheduling/NextGenSchedulingSystem.tsx

Proposed Solution

Replace the manual string constructor with `parseISO(day)` or use `utcToZonedTime` before formatting; add a unit test for PST users.

Expected Outcome

Daily hour summaries render with the correct day label regardless of browser timezone.

Estimated Effort

3h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R03] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
