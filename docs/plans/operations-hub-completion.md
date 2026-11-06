# Operations Hub

Pedro removed the Operations Hub automations feature from this branch. Task creation will be a form field later. This branch does not add that form.

## Removed

- Send to FlowForce, the automations panel, and the KPI "Fix automatically" suggestion.
- The issue AI button and `POST /api/ops/issues/[issueId]/suggest-automation`.
- `POST /api/ops/automations/run`, the browser automation adapter, and `NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT`.
- The run-log migration. There is no `ops_automation_runs` table in this pull request.

## Still in this branch

`migrations/20261104020901_ops_action_permissions.sql` is applied to production.

- Issue create and update, workflow templates, calendar generation, review, compliance packs, and workflow hooks require `editTasks`.
- An assigned person with `viewOwnTasks` can still update their own workflow run, steps, evidence, and exceptions.
- The checks call `current_user_has_permission`. If that function is already installed, this migration keeps it. Otherwise it installs a compatible check for the operations keys.

Production already has this migration, so do not push it again. Do not apply it from this agent, and do not merge this pull request from here.
