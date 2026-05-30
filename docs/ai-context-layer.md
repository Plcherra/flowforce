# AI Context Layer

Plan 07.02 gives AI a structured, tenant-scoped context layer. The goal is to feed prompts with useful operational facts without dumping raw records, names, emails, phone numbers, task titles, form titles, notes, or cross-tenant data into model input.

## Contract

The database exposes six module summaries through `ai_context_module_summaries_v`:

- `scheduling`
- `inventory`
- `tasks`
- `forms`
- `employees`
- `cost`

Each module row includes:

- `company_id`
- `module_key`
- `summary`
- `freshness_at`
- `redaction`
- `source_tables`

The snapshot RPC is `get_ai_context_snapshot(company_id)`. It returns a single JSON object with all six modules and only works when the tenant already has the Plan 07.01 AI governance baseline installed.

## Redaction Rules

AI context is intentionally aggregate-first:

- Raw PII is blocked.
- Cross-tenant data is blocked.
- Secret material is blocked.
- Payroll detail is blocked.
- Names, emails, phones, addresses, employee identifiers, task titles, form titles, item names, and location names are excluded or counted only.
- Financial values are aggregated.
- Free text is excluded or represented only through counts/statuses.

## Tenant Boundary

`ai_context_module_summaries_v` starts from the current user's tenant companies and emits exactly six rows for each visible company. `get_ai_context_snapshot(company_id)` also checks that the requested company is in `current_user_company_ids()`.

This means AI receives a stable prompt shape, and a user from one tenant cannot fetch another tenant's context.

## Readiness

`ai_context_readiness_v` reports whether the six required modules exist, freshness timestamps are declared, and redaction is enforced. It exposes `ready_for_prompt_contracts`, which will be the handoff into Plan 07.03 prompt contracts.

## Verification

Use:

```bash
npm run check:ai-context
supabase test db --local supabase/tests/phase7_ai_context_layer.test.sql
```

The DB test verifies tenant scoping, redaction, stable module count, and the governance prerequisite.
