# 07.07 Compliance And Workflow Assistant

Plan 07.07 is complete. FlowForce now has approval-gated compliance and workflow AI suggestions that cite workflow quality, task, form, and training signals without silently creating tasks or training assignments.

## Completed

- Added `buildValidatedComplianceWorkflowAssistant(snapshot)` with `compliance_assistant` prompt-contract validation.
- Added `ai_compliance_workflow_suggestions` as the review ledger for overdue workflow, failed checklist, corrective task, and training follow-up recommendations.
- Added `refresh_ai_compliance_workflow_suggestions(company_id)` to generate safe suggestions from tenant context and workflow execution metrics.
- Added `review_ai_compliance_workflow_suggestion(suggestion_id, decision, comments)` for manager approval or rejection without direct operational writes.
- Added audit events for creation, approval, and rejection.
- Wired the phase into local/release checks and the DB security suite.

## Safety Position

The assistant may suggest:

- overdue workflow review
- failed checklist pattern review
- corrective task drafts
- training follow-up drafts

It may not directly create tasks, training assignments, workflow exceptions, workflow reviews, or notification rows. Every stored suggestion keeps `approval_required = true`, `direct_write_executed = false`, and `writes_allowed = false`.

## Verification

- `npm run check:ai-compliance-workflow-assistant`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase7_compliance_workflow_assistant.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 07.08: Learning Loop should track accepted/rejected recommendations, capture reason codes, and keep tenant-specific learning separated.
