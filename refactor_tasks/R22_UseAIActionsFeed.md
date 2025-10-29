Task ID: R22
Section: Analytics & AI
Category: [AI-LOGIC]
Priority: High

Description

`useAIActionsFeed` executes heavy scheduling/expense queries even when a user lacks company context, needlessly loading fallback data.

Affected Areas

src/hooks/useAIActionsFeed.ts

Proposed Solution

Gate the consolidated queries on `profile?.companyId`, short-circuit when absent, and add tests covering anonymous/demo users.

Expected Outcome

The AI feed only runs when real data exists, reducing noise and Supabase load.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R22] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
