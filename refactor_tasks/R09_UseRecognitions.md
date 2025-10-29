Task ID: R09
Section: HR & Development
Category: [OPTIMIZATION]
Priority: High

Description

`useRecognitions` fetches all `goal_rewards` and filters client-side by metadata, pulling far more rows than necessary.

Affected Areas

src/hooks/useRecognitions.tsx

Proposed Solution

Convert the select into a filtered RPC or view (e.g., `.contains('reward_details->metadata->>company_id', companyId)`) and add indexes to support the filter.

Expected Outcome

Recognition sync runs faster and the Supabase payload remains limited to in-company records.

Estimated Effort

5h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R09] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
