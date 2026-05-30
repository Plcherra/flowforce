# AI Compliance And Workflow Assistant

Plan 07.07 adds approval-gated compliance and workflow recommendations to the AI copilot layer.

The assistant uses the tenant-scoped AI context snapshot plus workflow execution quality metrics. It can point managers toward overdue recurring workflows, failed checklist patterns, corrective task opportunities, and training follow-ups, but it never creates tasks or training assignments directly.

## Product Rules

- Detect overdue recurring workflows and task pressure.
- Summarize failed checklist patterns from workflow exception and quality metrics.
- Suggest corrective task drafts only for manager review.
- Suggest training follow-ups only for manager review.
- Cite source metrics and product routes.
- Keep all records scoped by `company_id`.

## Database Contract

The migration creates `ai_compliance_workflow_suggestions`, scoped views, and two RPCs:

- `refresh_ai_compliance_workflow_suggestions(company_id)`
- `review_ai_compliance_workflow_suggestion(suggestion_id, decision, comments)`

Every suggestion is stored with:

- `approval_required = true`
- `direct_write_executed = false`
- `suggested_action.writes_allowed = false`
- `suggested_action.requires_human_approval = true`

Approval and rejection are audit-only in this phase. They do not create tasks, training assignments, workflow exceptions, or workflow reviews.

## Evidence

Evidence links point managers toward:

- `/app/operations`
- `/app/tasks`
- `/app/forms`
- `/app/learning-center`

Evidence values are aggregate workflow, task, form, and training metrics. They avoid raw free-text evidence, employee PII, and checklist payloads.

## Verification

- `npm run check:ai-compliance-workflow-assistant`
- `supabase test db --local supabase/tests/phase7_compliance_workflow_assistant.test.sql`
- `npm run test:db:security`
