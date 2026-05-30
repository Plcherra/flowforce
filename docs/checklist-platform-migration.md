# Checklist Platform Migration Path

Date: 2026-05-30
Roadmap phase: 09.04 Checklist Platform Migration Path

## Goal

FlowForce should let checklist-driven operators recreate opening, closing, cleaning, food-safety, and manager review routines as executable workflows.

09.04 builds on the generic migration approach without naming or depending on a specific legacy provider. The adapter converts exported checklist templates into the existing SOP/checklist builder payload used by `create_sop_checklist_template(company_id, template)`.

## Imported Data

The v1 checklist migration path covers:

- Checklists: become executable workflow templates.
- SOPs: become workflow templates with forms and review required.
- Forms: checklist step input types become form fields and workflow steps.
- Locations: imported location names are preserved for assignment review.
- Recurring tasks: recurrence becomes workflow assignment schedule rules.

## Template Mapping

The canonical adapter contract lives in `src/services/integrations/checklistMigrationPath.ts`.

Template aliases:

- `Checklist name`: Template, Procedure, SOP name.
- `Description`: Instructions, Overview.
- `Category`: Group, Area.
- `Type`: Workflow kind.
- `Locations`: Stores, Sites.
- `Recurrence`: Frequency, Cadence.

Step aliases:

- `Step`: Task, Question, Item.
- `Step description`: Help text, Instruction.
- `Input type`: Field type, Response type.
- `Required`: Mandatory.
- `Evidence required`: Photo required, Attachment required.

## Field Mapping

Supported imported step input types:

- `yes_no`
- `text`
- `number`
- `photo`
- `temperature`
- `signature`

Unsupported field types default to `yes_no` and create a warning for review.

Photo and signature fields automatically require evidence. Temperature and number fields preserve minimum and maximum validation rules when present.

## Post-Import Workflow Review

Every imported checklist requires review before activation. The review checklist includes:

- Match imported location names to FlowForce locations.
- Confirm recurring cadence and due window before publishing.
- Confirm photo, signature, and temperature evidence requirements.
- Manager approval of the imported workflow template.

This keeps migration fast while preventing a legacy checklist export from silently creating bad live routines.

## Verification

09.04 is complete when:

- `npm run check:checklist-migration` passes.
- Sample checklist exports produce executable SOP/checklist builder payloads.
- Validation catches missing names or missing steps.
- Post-import review is required for every imported workflow template.
