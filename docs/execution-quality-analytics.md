# Execution Quality Analytics

Phase 06.09 turns workflow history into manager-ready execution quality signals. It measures completion, overdue work, exceptions, repeated failed steps, failed step volume, training context, and coaching priority without adding a manual review dependency.

## Data Contract

- `operations_execution_quality_daily_v` groups workflow execution by company, date, location, department, assigned role, workflow kind, and template category.
- `operations_execution_quality_summary_v` summarizes the last 30 days for the current tenant.
- `operations_execution_quality_coaching_v` connects person-level workflow outcomes to open training assignments and coaching recommendations.
- All views use `security_invoker` and `current_user_company_ids()` so cross-tenant analytics stay blocked by membership.

## Score Model

Execution quality starts at 100 and subtracts weighted penalties for overdue runs, exception runs, critical exceptions, repeat failures, pending reviews, and failed steps. The score is intentionally simple for v1 so managers can explain it during shift reviews and training conversations.

## Coaching Signals

- `repeat_failure`: repeated failure on the same workflow step within 30 days.
- `exception_rate`: exception activity without a repeat-failure pattern.
- `overdue`: incomplete work past the due window.
- `training_followup`: open training assignments with otherwise cleaner execution.
- `recognition`: no active negative signal in the 30-day window.

## Product Surface

The Operations hub now includes an `ExecutionQualityPanel` that shows score, completion, overdue, repeat failures, recent trends, and coaching recommendations. Missing remote views are handled softly during rollout so the UI does not crash before the migration is pushed.
