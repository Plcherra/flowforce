# AI Learning Loop

Plan 07.08 adds tenant-scoped feedback for AI recommendations.

The learning loop records whether managers accepted or rejected AI suggestions, captures a reason code, and exposes aggregate learning signals that future assistants can use to rank or suppress recommendations. It does not train a cross-tenant model and it does not store raw tenant context for model reuse.

## Product Rules

- Track accepted and rejected AI recommendations from scheduling, inventory/waste, and compliance/workflow suggestion ledgers.
- Capture a controlled reason code for every feedback record.
- Keep learning scoped to the tenant that produced the suggestion.
- Store only suggestion metadata, outcome, reason code, and optional reviewer notes.
- Never use one tenant's feedback to improve another tenant's suggestions.

## Reason Codes

Supported reason codes are:

- `useful`
- `wrong_context`
- `duplicate`
- `unsafe`
- `low_confidence`
- `not_relevant`
- `better_manual_action`
- `policy_blocked`
- `stale_data`
- `other`

Unknown values are normalized to `other` by product code and rejected by the database unless already normalized.

## Database Contract

The migration creates `ai_recommendation_feedback`, tenant-scoped views, and two RPCs:

- `record_ai_recommendation_feedback(source_table, source_id, outcome, reason_code, notes)`
- `get_ai_learning_adjustment(company_id, prompt_key, suggestion_type)`

Feedback can only be recorded for approved or rejected suggestions in:

- `ai_scheduling_suggestions`
- `ai_inventory_waste_suggestions`
- `ai_compliance_workflow_suggestions`

Every feedback record stores:

- `feedback_scope = 'tenant'`
- `no_cross_tenant_training = true`
- `learning_fingerprint` prefixed with the tenant `company_id`

## Learning Use

The learning adjustment RPC returns bounded, tenant-only hints:

- `boost` when similar recommendations are repeatedly accepted
- `deprioritize` when similar recommendations are repeatedly rejected
- `neutral` when the signal is too weak

These hints are inputs for future suggestion ranking. They are not autonomous writes and they do not override approval gates.

## Verification

- `npm run check:ai-learning-loop`
- `supabase test db --local supabase/tests/phase7_learning_loop.test.sql`
- `npm run test:db:security`
