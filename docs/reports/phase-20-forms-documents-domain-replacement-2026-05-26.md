# Phase 20 - Forms And Documents Domain Replacement

Date: 2026-05-26

## Goal

Continue replacing the legacy restore migration with reviewed forward contracts for forms, custom sections, documents, reports, and helpdesk records.

## Completed

- Added `supabase/migrations/20260526000100_phase20_forms_documents_domain_replacement.sql`.
- Added required `company_id` ownership to restore-era form/report helper tables that previously relied on indirect references:
  - `custom_reports`
  - `form_access_rules`
  - `form_field_locations`
  - `form_field_ratings`
  - `form_field_scans`
  - `form_field_signatures`
  - `form_reviewer_rules`
  - `form_submission_files`
  - `form_submission_reviewers`
  - `report_events`
- Converted form child reference columns from free-text UUIDs to real UUID columns where safe, then added forward foreign-key contracts for form, submission, field, profile, department, and company ownership.
- Added company-id inheritance triggers for custom reports, form child tables, helpdesk tickets, and report events.
- Replaced generic restore containment policies with explicit tenant policies for:
  - `forms`
  - `form_fields`
  - `form_submissions`
  - `form_access_rules`
  - `form_field_locations`
  - `form_field_ratings`
  - `form_field_scans`
  - `form_field_signatures`
  - `form_reviewer_rules`
  - `form_submission_files`
  - `form_submission_reviewers`
  - `custom_sections`
  - `custom_section_pages`
  - `section_templates`
  - `custom_reports`
  - `documents`
  - `files`
  - `helpdesk_tickets`
  - `report_events`
- Added `supabase/tests/phase20_forms_documents_domain_contracts.test.sql` covering two-tenant visibility, trigger-based company inheritance, cross-tenant write rejection, and privileged missing-company rejection.
- Added the Phase 20 pgTAP suite to `npm run test:db:security`.
- Tightened `scripts/check-supabase-contract.mjs` so deploy checks now monitor the forms/documents restore-replacement tables.

## Verification

- `env -u DOCKER_HOST supabase db reset` passed.
- `env -u DOCKER_HOST supabase test db --local supabase/tests/phase20_forms_documents_domain_contracts.test.sql` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed.
- Local Supabase contract check passed against the reset local stack:
  - 0 missing relations
  - 0 relation errors
  - 0 missing RPCs
  - 0 anon exposures
  - 0 security contract errors
- `supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --yes` applied the Phase 20 migration remotely.
- `env -u DOCKER_HOST npm run check:deploy` passed against the linked remote project: 26 local migrations and 26 remote migrations matched, with 0 remote schema/security contract errors.

## Local Environment Note

- The default Colima VM was stuck with a stale VZ disk attachment.
- A fresh `flowforce` Colima profile was started for validation.
- The local Supabase stack was started with `vector` excluded because Colima could not mount the forwarded Docker socket into the vector container; DB reset and pgTAP validation do not require that service.

## Remaining Work

- Continue restore replacement by domain:
  - inventory/finance
  - learning/recognition/gamification
  - analytics/operations/copilot
- Once all domains own their explicit constraints, grants, and policies, retire the old restore migration as a historical stabilization artifact.
