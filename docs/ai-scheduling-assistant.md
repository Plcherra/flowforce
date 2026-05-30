# AI Scheduling Assistant

Plan 07.05 adds the scheduling assistant as a guarded suggestion system. It can detect coverage gaps, possible under/overstaffing, replacement review needs, and labor-cost review signals. It does not publish schedules or write shifts.

## Scope

The scheduling assistant can:

- Suggest shift review items based on demand, coverage, roles, and labor cost.
- Detect unassigned shifts and possible understaffing.
- Detect possible overstaffing.
- Suggest replacement review when schedules exist but active employee context is missing.
- Store suggestions for manager review.

## Safety Boundary

Scheduling suggestions are not schedule writes:

- `prompt_key` must be `scheduling_assistant`.
- `approval_required` must be `true`.
- `direct_write_executed` must be `false`.
- `writes_allowed` must be `false`.
- Approval changes only the suggestion status. It does not publish or mutate schedule rows.

## Data Flow

1. `get_ai_context_snapshot(company_id)` creates tenant-scoped aggregate context.
2. `refresh_ai_scheduling_suggestions(company_id)` creates pending scheduling suggestions.
3. Suggestions are stored in `ai_scheduling_suggestions`.
4. Managers can approve or reject suggestions through `review_ai_scheduling_suggestion(suggestion_id, decision, comments)`.
5. Refresh and review actions are logged to `audit_log`.

## Evidence

Evidence links point to product surfaces:

- `/app/enhanced-scheduling`
- `/app/employees`
- `/app/reports`

The assistant cites aggregate context metrics, not raw names, personal data, notes, or private schedule text.

## Verification

Use:

```bash
npm run check:ai-scheduling-assistant
supabase test db --local supabase/tests/phase7_scheduling_assistant.test.sql
```

The DB test verifies tenant scoping, pending-review status, approval gating, no direct schedule writes, audit events, and cross-tenant rejection.
