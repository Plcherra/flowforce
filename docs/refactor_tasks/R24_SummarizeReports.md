Task ID: R24
Section: Analytics & AI
Category: [AI-LOGIC]
Priority: High

Description

`summarizeWeeklyReports` loops through employees client-side and performs per-employee upserts, which is slow and fails without elevated privileges.

Affected Areas

src/copilot/summarizeReports.ts

Proposed Solution

Implement the summarisation as a Supabase RPC or scheduled edge function that performs set-based updates.

Expected Outcome

Weekly report summaries run efficiently with appropriate credentials.

Estimated Effort

6h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R24] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
