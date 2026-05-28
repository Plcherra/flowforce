# Forms And Sections Completion

Date: 2026-05-28

Purpose: define the pilot-ready forms and configurable sections surface for the authenticated web app.

## Product Rule

Forms and sections must be usable as an execution layer, not just configuration screens:

- Managers must see form builder, submission, field, file, and review readiness in one place.
- Active forms must surface missing fields, missing reviewer rules, and empty published usage.
- Restaurant and retail starter templates must create real fields, not just placeholder form names.
- Advanced field types such as ratings, signatures, scans, locations, and file uploads must be counted.
- Section admins must see custom page, permission, template, and enabled-state coverage.
- Add-section actions must route to the authenticated app path.

## Forms Readiness Surface

The forms page now includes a readiness panel with these signals:

- Published forms.
- Draft forms.
- Total submissions.
- Pending submission reviews.
- Required fields.
- Forms with no fields.
- Advanced field coverage.
- Private-storage field coverage.
- Published forms without reviewer rules.

The panel keeps the existing form builder and submission workflows intact while making setup gaps visible before pilot use.

## Starter Templates

The form creation flow now includes restaurant and retail starter templates with real fields:

- Restaurant opening checklist with station checks, location confirmation, and manager signature.
- Food safety temperature log with temperature capture, corrective action, and evidence photo upload.
- Retail inventory count with barcode/QR scan, on-hand count, shelf rating, and shelf photo upload.

## Sections Readiness Surface

The sections and access page now includes a readiness panel with these signals:

- Built-in section count.
- Custom section count.
- Active and inactive custom sections.
- Custom pages.
- Active custom sections without pages.
- Active custom sections without permissions.
- Template-backed sections.

The Add Section action now points to `/app/add-section` consistently from the sections manager and readiness panel.

## Data Sources

The readiness surfaces read:

- `forms`
- `form_fields`
- `form_submissions`
- `form_reviewer_rules`
- `form_submission_reviewers`
- `custom_sections`
- `custom_section_pages`
- `AVAILABLE_SECTIONS`

## Deferred

Later phases should add:

- A larger industry template catalog with versioning.
- A consolidated manager review queue across forms, tasks, and operations.
- Deeper form-to-operation automation rules.
- Exportable form submission reports.
