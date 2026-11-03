# Operations Hub completion

Scan of `/app/operations` on `cursor/operations-hub-live-data-65fc` after merging `main`. This file is the list of what has to be real before the hub is finished. Production Supabase is not changed from this branch. New SQL is a migration file only.

## Shipped on this branch

- The plan below.
- Migration for run logs and the suggestion write guard. Not applied to production.
- `POST /api/ops/automations/run` with session, company, and `ai.actions.automate` checks. The browser no longer POSTs scripts.
- View-column aliases so issue, run, step, and hook ids match the database.
- Issue suggestions store `company_id` and `issue_id`.
- Hub write buttons follow `editTasks`, `ai.actions.suggest`, or `ai.actions.automate`.
- Hard-coded hub toasts, preset labels, and status labels go through `t()` in all six locales.
- Execution quality shows no score when the company has no summary row.
- Operations Intelligence no longer substitutes mock KPI numbers when `get_kpi_summary` is missing.

## What is already real

- Task compliance, inventory health, and labor versus sales are computed from this company's rows in `useOperationsHubMetrics`. Empty sources say they are empty. They do not show the old sample percents.
- Inventory health uses summed `inv_stock_positions.quantity_on_hand`.
- Generate suggestion inserts a `pending` row in `ops_automation_suggestions` with `company_id` set. Nothing runs until Send to FlowForce.
- Issues, workload, field runs, manager review, compliance packs, workflow hooks, and execution quality read company-scoped views or RPCs. Those RPCs are real when the ids they receive are the ids the views return.
- Row level security already limits `ops_issues` and `ops_automation_suggestions` to `current_user_company_ids()`.

## Findings

| Surface | What a person sees | What actually happens |
| --- | --- | --- |
| Send to FlowForce | Button on each pending suggestion | `AutomationsPanel` calls `dispatchAutomationToFlowForce` in the browser. That POSTs the whole script, including any `db_insert` step, to `NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT` with no session. The variable is empty, so the request is skipped and the suggestion stays pending. If the variable were set, nothing in this app would authenticate or constrain the script. |
| Active automations | A row moves to Active after a successful send | The panel sets `status` to `active` from the browser. It does not create a task, a notification, or a run log. Any company member can do the same update under the current RLS policy. |
| Fix automatically | Saves a suggestion | Real insert. The script is only `query` + `create_task` + `notify`. It is not executed here. |
| Issue Ack / Start / Resolve / AI | Buttons on each issue | The queue view returns `issue_id`. The panel reads `issueid`, so the RPC and the suggest route are called with an empty id. Toasts and the drawer description are hard-coded English. |
| AI suggestion route | Drawer shows a JSON script | `generateAutomationSuggestion` loads `ops_issues` by `org_id` and inserts `issueid` (not a column) without `company_id`. Service role bypasses RLS, so a row can be stored where the hub cannot see it. The drawer does not refresh Suggested automations. |
| SOP, calendar, field runs, review, compliance, hooks | Buttons call RPCs | The RPCs are real. Several views return `workflow_instance_id`, `step_instance_id`, `template_category`, and similar names. The panels read concatenated names such as `workflow_instanceid`, so Start, Complete, Approve, and the run picker can run against an empty id. Toasts and several labels are hard-coded English. Built-in SOP, calendar, and compliance catalogs are starter templates, not this company's history. Publishing or installing them writes real workflow rows. |
| Execution quality | A score of 0 | When the summary view has no row, the card still shows 0. That is an empty company, not a measured score. |
| Permissions | Every signed-in company member can use every button | The hub never calls `useCan`. `ai.actions.automate` exists for owner and admin. Managers have `ai.actions.suggest` and `ai.actions.approve`, not automate. `IfCan` treats the `can` function as a boolean, so it always renders its children. This plan does not change `IfCan` globally. |
| Operations Intelligence | Separate from the hub page | `useIdeaInsights` and `useIdeaAssessments` substitute `MOCK_IDEA_KPI_SUMMARY` when `get_kpi_summary` is missing. Those numbers are not this company's. |
| Copy | Mixed | Hub KPI and signal copy goes through `t()`. Issue, SOP, calendar, field, review, compliance, hook, and quality toasts and several labels do not. Preset names live in English in the service files because contract checks require those strings to stay there. |

## Safe automation runner

Send to FlowForce must not POST a script from the browser.

1. The button sends only the suggestion id and the signed-in session to `POST /api/ops/automations/run`.
2. The route resolves the user with the bearer token, then the company from that user's profile. It does not trust a company id in the body.
3. The route loads the suggestion for that company and runs the stored script, not a script from the request.
4. Running requires `ai.actions.automate` on the company role, with the same deny-over-allow-over-role order as the app resolver. Owner product level is allowed unless that key is stored false or a deny override exists. Managers can still save suggestions. They cannot run them unless that key is granted.
5. The script is validated, then planned. Unknown work fails the run before any write.
   - `query` may only name `operations_hub`, and that step records context. It does not read a table named by the script.
   - `create_task` inserts one `tasks` row for this company, created by the actor, status `todo`. Assignee role on the script is ignored.
   - `notify` with channel `operations` inserts one `task_notifications` row for the actor only. Other channels are rejected.
   - `branch` is rejected. Conditions are not evaluated.
   - `db_insert` writes only tables and scalar columns in `AUTOMATION_INSERT_ALLOWLIST`. That map is empty. `company_id`, `org_id`, `id`, `user_id`, and `actor_id` are never taken from the script.
6. A run row and step rows are written first. If those tables are missing, the suggestion stays pending and the button says logs are not set up. No task is created in that case.
7. The suggestion becomes `active` only after the planned writes succeed. A failed run returns it to `pending` and deletes tasks created during that attempt.
8. Authenticated clients cannot insert an already-active suggestion or change `status` or `script` after insert. Service role and non-JWT SQL (migrations and database tests) can. This closes the browser path that marked a suggestion active without running it.

## Migration

`supabase/migrations/20261103002422_ops_automation_runs.sql` adds:

- `ops_automation_runs` and `ops_automation_run_steps`, with RLS, select for authenticated company members, and no anon grant.
- The suggestion write guard described above.

Do not apply this file to production from the agent. Release Gates rebuild the local database from migrations, so the local gate still sees it. Deploy Readiness remote drift runs on `main` only. Applying it is Pedro's step: `supabase db push` for this file, then a refresh of flowforce.uk after the web deploy. Until then, Send to FlowForce on production returns the storage message and does not run.

## Left for Pedro

- Apply the migration, then try Send to FlowForce on a signed-in owner or admin account. A pending KPI suggestion should create a task assigned to nobody, notify the person who pressed the button, and move to Active. A second press should say it already ran. A manager without `ai.actions.automate` should see the permission message and the row should stay pending.
- Decide whether managers should receive `ai.actions.automate`. Today only owner and admin have it. Granting it is a role change, not a code change.
- Decide whether `db_insert` should ever be allowed. The allowlist stays empty until a table and its columns are named. `create_task` and `notify` are separate handlers, not allowlist rows.
- Decide whether `branch` should learn a tiny comparison language. It is rejected on purpose.
- `IfCan` is always true because it checks the function object. Fixing it changes every screen that uses it. That is outside this hub change.
- Operations Intelligence still has its own diagnose, execute, and assess flows. Mock KPI numbers are removed when `get_kpi_summary` is missing, but the rest of that page was not rebuilt here.
- Preset SOP, calendar, and compliance names are translated in the hub. The English source strings stay in the service files so the existing contract checks keep matching. Published checklist names follow the language of the person who presses Publish.
- Issue, workflow, and compliance buttons are still company-member RPCs. The hub hides the write buttons without `editTasks` (and the AI button without `ai.actions.suggest`). The database policies were not narrowed to those keys.
- View-column aliases fix the id mismatch in the hub panels. A later cleanup can rename the TypeScript fields to the real column names.
- Preview deployments cannot sign in. Check the hub on a signed-in environment after the migration is applied.
