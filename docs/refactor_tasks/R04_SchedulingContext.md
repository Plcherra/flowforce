Task ID: R04
Section: Operations
Category: [OPTIMIZATION]
Priority: Medium

Description

`bulkCreateShifts` loops through `upsertShift`, triggering a full `refetchAll` after every insert, resulting in redundant round-trips and sluggish week copy.

Affected Areas

src/contexts/SchedulingContext.tsx

Proposed Solution

Introduce a bulk insert pathway (single Supabase `insert` with normalized payloads) and only `refetchAll` once; update `copyWeek` to use the bulk path directly.

Expected Outcome

Bulk shift creation completes markedly faster and reduces Supabase load.

Estimated Effort

6h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R04] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
