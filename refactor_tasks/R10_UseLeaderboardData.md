Task ID: R10
Section: HR & Development
Category: [BUGFIX]
Priority: Medium

Description

`mapToLeaderboardEntry` drops entries when the employee is missing from the `useEmployees` cache, causing the leaderboard to omit valid performers.

Affected Areas

src/features/leaderboard/useLeaderboardData.ts

Proposed Solution

Fall back to the Supabase row data when the enriched employee lookup fails and add tests covering employees absent from the local roster.

Expected Outcome

Leaderboard rankings remain complete even when the employee list is stale.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R10] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
