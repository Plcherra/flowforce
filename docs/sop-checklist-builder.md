# SOP And Checklist Builder

Date: 2026-05-28

Plan: 06 Operations Workflows And Compliance

Phase: 06.02 SOP And Checklist Builder

## Goal

Managers can create repeatable operational routines for opening, closing, cleaning, safety, and inventory work. A published template must create both a form schema and an executable workflow template.

## Builder Contract

`create_sop_checklist_template(p_company_id, p_template)` creates:

- A published `forms` row for field/input capture.
- Ordered `form_fields` for required fields, attachments, signatures, ratings, scans, and task fields.
- A `workflows` template with category, review policy, retention policy, and source form link.
- Ordered `workflow_steps` linked to the generated form fields.
- A `workflow_assignments` rule with assignment type, due window, schedule rule, and escalation rule.

The RPC is security invoker and requires `p_company_id` to be in `current_user_company_ids()`.

## Supported Template Categories

- Opening
- Closing
- Cleaning
- Safety
- Inventory

## Supported Evidence Types

- Boolean checks
- Numeric readings
- Image upload
- Signature
- Rating
- Scanner
- Task follow-up
- Free-text notes

## UI Surface

`SopChecklistBuilderPanel` appears in the Operations Hub. It exposes the v1 presets and publishes a selected preset through `create_sop_checklist_template`.

## Verification

- `npm run check:sop-checklist-builder`
- `supabase/tests/phase6_sop_checklist_builder.test.sql`
- `npm run check:local`
- `npm run test:db:security`

## Remaining Work

- Add custom step editing beyond presets.
- Add location and role pickers backed by live tenant data.
- Add richer preview mode with the exact mobile execution shell.
- Add template duplication and archive controls.
