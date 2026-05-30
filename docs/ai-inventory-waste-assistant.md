# AI Inventory And Waste Assistant

Plan 07.06 adds approval-gated inventory and waste recommendations to the AI copilot layer.

The assistant uses the tenant-scoped AI context snapshot from `get_ai_context_snapshot(company_id)` and the prompt contracts for `inventory_assistant` and `waste_assistant`. It cites aggregate source metrics, stores suggestions for manager review, and never writes inventory, purchasing, prep, or waste rows directly.

## Product Rules

- Detect repeated stockout or below-minimum signals from the 30-day cost context.
- Suggest reorder threshold or purchase review when inventory setup is incomplete.
- Detect waste outliers from aggregated waste cost.
- Suggest prep or purchasing adjustments only as manager-review drafts.
- Keep all records scoped by `company_id`.
- Require manager approval before any future product write path can act on a suggestion.

## Database Contract

The migration creates `ai_inventory_waste_suggestions`, scoped views, and two RPCs:

- `refresh_ai_inventory_waste_suggestions(company_id)`
- `review_ai_inventory_waste_suggestion(suggestion_id, decision, comments)`

Every suggestion is stored with:

- `approval_required = true`
- `direct_write_executed = false`
- `suggested_action.writes_allowed = false`
- `suggested_action.requires_human_approval = true`

Approval and rejection are audit-only in this phase. They do not create purchases, prep plans, inventory adjustments, or waste records.

## Evidence

Evidence links point managers toward the relevant product surfaces:

- `/app/inventory`
- `/app/inventory/reports`
- `/app/inventory/purchasing`

Evidence values are aggregate metrics from inventory and cost context, not raw item names, employee data, vendor details, or free-text waste notes.

## Verification

- `npm run check:ai-inventory-waste-assistant`
- `supabase test db --local supabase/tests/phase7_inventory_waste_assistant.test.sql`
- `npm run test:db:security`
