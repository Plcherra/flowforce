# 07.09 AI Observability And Cost Controls

Plan 07.09 is complete. AI cost and reliability are visible through tenant-scoped usage telemetry, model budgets, retry/timeout policy, and dashboard-ready views.

## Completed

- Added `buildAIUsageEvent(input)` for product-side AI usage event shaping.
- Added `ai_usage_events` for model, token, latency, retry, timeout, cost, error, user, and fallback telemetry.
- Added `ai_budget_controls` for tenant/model monthly token and cost limits.
- Added `record_ai_usage_event(company_id, prompt_key, model, status, input_tokens, output_tokens, latency_ms, retry_count, timeout_ms, error_code, error_message, cost_usd, metadata)`.
- Added `upsert_ai_budget_control(company_id, model, monthly_token_limit, monthly_cost_limit_usd, max_retries, timeout_ms, enabled)`.
- Added monthly usage, budget status, admin dashboard, and readiness views.
- Added audit coverage for usage events, degraded/fallback behavior, and budget changes.

## Safety Position

Budget-blocked, failed, timed-out, and fallback AI calls are logged as first-class telemetry. The safe fallback state keeps `writesAllowed = false` and `requiresHumanApproval = true`, preserving the approval-gated posture from earlier Plan 7 phases.

Tenant/model budgets are admin-controlled. Usage and budget views stay tenant-scoped through `current_user_company_ids()`.

## Verification

- `npm run check:ai-observability`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase7_ai_observability.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 07.10: AI Copilot Signoff should add release gates, a safety checklist, seeded demo workflow, and final Plan 7 status updates.
