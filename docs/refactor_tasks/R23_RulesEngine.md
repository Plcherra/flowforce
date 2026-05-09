Task ID: R23
Section: Analytics & AI
Category: [AI-LOGIC]
Priority: Critical

Description

`copilot/rulesEngine.evaluateEmployee` uses the browser Supabase client to read privileged HR tables, bypassing RLS and exposing sensitive data.

Affected Areas

src/copilot/rulesEngine.ts

Proposed Solution

Move the evaluation into a Supabase function or server route with service-key privileges and call it from the client; add permission checks.

Expected Outcome

Copilot evaluations run server-side with proper access control, keeping sensitive HR data off the client.

Estimated Effort

8h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R23] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
