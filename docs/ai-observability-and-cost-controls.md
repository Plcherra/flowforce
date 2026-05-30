# AI Observability And Cost Controls

Plan 07.09 makes AI usage visible and bounded before richer copilot surfaces are shipped.

FlowForce records model usage, token counts, latency, retry attempts, timeout configuration, errors, fallback behavior, and estimated cost per tenant. Tenant admins can set model-level budgets so runaway usage fails closed into a safe fallback instead of silently spending.

## Product Rules

- Every AI call path should record a usage event through `record_ai_usage_event(...)` from a trusted server/service-role context.
- Failed, timed-out, budget-blocked, and fallback events are first-class records, not hidden logs.
- Tenant/model budgets are controlled by admins only.
- Budget blocks return a safe fallback state with `writes_allowed = false`.
- Usage dashboards must be tenant-scoped.

## Database Contract

The migration creates:

- `ai_usage_events`
- `ai_budget_controls`
- `ai_usage_monthly_summary_v`
- `ai_budget_status_v`
- `ai_usage_admin_dashboard_v`
- `ai_observability_readiness_v`

It also adds two RPCs:

- `record_ai_usage_event(company_id, prompt_key, model, status, input_tokens, output_tokens, latency_ms, retry_count, timeout_ms, error_code, error_message, cost_usd, metadata)` is server-only; authenticated clients cannot execute it directly.
- `upsert_ai_budget_control(company_id, model, monthly_token_limit, monthly_cost_limit_usd, max_retries, timeout_ms, enabled)`

## Retry And Timeout Policy

The default app-side policy is:

- `maxRetries = 2`
- `timeoutMs = 15000`
- retry only failed or timed-out provider calls

The budget control table can override retry and timeout policy per tenant/model. Even when retries are enabled, AI suggestions remain approval-gated and do not write operational records directly.

## Budget Behavior

Budget status is calculated monthly per tenant/model:

- `should_alert` becomes true at 80 percent usage.
- `should_block` becomes true once token or cost limits are reached.
- budget-blocked calls should return a fallback result and log an `ai_usage_events.status = 'budget_blocked'` record.

## Verification

- `npm run check:ai-observability`
- `supabase test db --local supabase/tests/phase7_ai_observability.test.sql`
- `npm run test:db:security`
