Task ID: R06
Section: HR & Development
Category: [BUGFIX]
Priority: Critical

Description

Learning catalog/service queries ignore company context, so `fetchLearningCatalog` and related helpers return courses from every tenant.

Affected Areas

src/services/learning/learningService.ts, src/hooks/learning/useLearningCenter.ts

Proposed Solution

Thread `companyId` into service calls, add `.eq('company_id', …)` filters on courses/modules/metrics, and update the hook to pass the active company; add integration tests verifying isolation.

Expected Outcome

Learning center views and metrics only surface data belonging to the signed-in company.

Estimated Effort

7h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R06] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
