# AI Manager Briefing

Plan 07.04 turns the AI context and prompt-contract layers into a read-only manager briefing. The briefing is designed for daily operations: it surfaces risks, shows evidence routes, and logs refreshes without creating tasks, schedule changes, purchases, or compliance records.

## Scope

The manager briefing covers:

- Staffing risks.
- Inventory setup and stock risk signals.
- Overdue tasks.
- Workflow exceptions.
- Form/compliance reminders.
- Cost and waste anomalies.

## Data Flow

1. `get_ai_context_snapshot(company_id)` builds the tenant-scoped aggregate context.
2. `manager_briefing` prompt contract defines the strict JSON output shape.
3. `refresh_ai_manager_briefing(company_id)` creates a read-only briefing run.
4. The run is stored in `ai_manager_briefing_runs`.
5. The refresh is logged to `audit_log` as `ai.manager_briefing.generated`.

## Evidence Links

Briefing evidence points to product routes instead of exposing raw records:

- `/app/enhanced-scheduling`
- `/app/inventory`
- `/app/tasks`
- `/app/operations`
- `/app/forms`
- `/app/employees`
- `/app/reports`

This keeps the briefing actionable while preserving the aggregate-only AI boundary from Plan 07.02.

## Safety

Manager briefing output is read-only:

- `prompt_key` must be `manager_briefing`.
- `writes_allowed` must be `false`.
- `requires_human_approval` must be `true`.
- Raw PII, payroll detail, secret material, and cross-tenant data remain blocked.
- Refreshes require company membership and the AI governance/context/prompt contract prerequisites.

## Verification

Use:

```bash
npm run check:ai-manager-briefing
supabase test db --local supabase/tests/phase7_manager_briefing.test.sql
```

The DB test verifies tenant access, read-only safety, evidence links, audit logging, and cross-tenant rejection.
