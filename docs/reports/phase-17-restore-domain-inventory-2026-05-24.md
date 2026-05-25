# Phase 17 - Restore Migration Domain Inventory

Date: 2026-05-24

## Goal

Prepare the old restore migration for safe domain replacement without rewriting applied migration history blindly.

## Source

- Migration: `supabase/migrations/20260513000100_restore_feature_schema.sql`
- Tables found: 172
- Placeholder views found: 4
- Broad grant/default privilege statements found: 7
- Empty table shells found: 2

## Domain Inventory

### core-tenant-auth

Tenant identity, membership, permissions, settings, and audit.

Objects: 17

- `audit_log` (table, line 57)
- `companies` (table, line 169)
- `company_invites` (table, line 194)
- `company_members` (table, line 210)
- `company_roles` (table, line 218)
- `company_settings` (table, line 233)
- `departments` (table, line 419)
- `org_prefs` (table, line 1281)
- `permission_audit_logs` (table, line 1329)
- `position_assignments` (table, line 1335)
- `positions` (table, line 1345)
- `profiles` (table, line 1360)
- `role_permissions` (table, line 1474)
- `system_logs` (table, line 1649)
- `user_companies` (table, line 1775)
- `user_permissions` (table, line 1783)
- `user_roles` (table, line 1792)

### people-hr

Employee records, reports, performance, compliance, and HR roster data.

Objects: 13

- `compliance_rules` (table, line 305)
- `employee_badge` (table, line 435)
- `employee_certifications` (table, line 444)
- `employee_report` (table, line 457)
- `employee_report_summary` (table, line 468)
- `employees` (table, line 474)
- `engagement_scores` (table, line 480)
- `hr_roster_cache` (table, line 733)
- `performance_goal_reviews` (table, line 1317)
- `performance_reviews` (table, line 1323)
- `skill_matrix` (table, line 1597)
- `staff_availability` (table, line 1607)
- `staff_performance` (table, line 1618)

### scheduling-calendar

Calendar, events, shifts, availability, time off, and vendor visits.

Objects: 26

- `availability_exception` (table, line 63)
- `availability_request` (table, line 69)
- `calendar_events` (table, line 97)
- `event_participants` (table, line 493)
- `event_shift_links` (table, line 499)
- `events` (table, line 506)
- `schedule_assignments` (table, line 1486)
- `schedule_rulebooks` (table, line 1497)
- `schedule_shifts` (table, line 1503)
- `schedule_workflow_criteria` (table, line 1509)
- `schedule_workflow_steps` (table, line 1515)
- `schedules` (table, line 1521)
- `shift_assignments` (table, line 1561)
- `shift_swaps` (table, line 1569)
- `shift_templates` (table, line 1581)
- `supervisor_schedule` (table, line 1637)
- `time_entries` (table, line 1719)
- `time_off_requests` (table, line 1730)
- `user_unavailability` (table, line 1799)
- `vendor_sync_logs` (table, line 1820)
- `vendor_visits` (table, line 1826)
- `week_templates` (table, line 1842)
- `work_schedules` (table, line 1852)
- `calendar_events_full` (view, line 1900)
- `calendar_unified_view` (view, line 1907)
- `vendor_event` (view, line 1921)

### messages-announcements

Messages, channels, announcements, company updates, and notification surfaces.

Objects: 12

- `announcement_reads` (table, line 19)
- `announcements` (table, line 25)
- `channel_members` (table, line 155)
- `company_update_comments` (table, line 245)
- `company_update_engagement` (table, line 255)
- `company_update_reactions` (table, line 269)
- `company_updates` (table, line 278)
- `message_channels` (table, line 1183)
- `message_reactions` (table, line 1193)
- `messages` (table, line 1200)
- `reminders` (table, line 1431)
- `task_notifications` (table, line 1672)

### forms-sections-documents

Forms, custom sections, documents, files, and generic attachments.

Objects: 17

- `attachments` (table, line 51)
- `custom_section_pages` (table, line 376)
- `custom_sections` (table, line 390)
- `documents` (table, line 429)
- `files` (table, line 530)
- `form_access_rules` (table, line 536)
- `form_field_locations` (table, line 544)
- `form_field_ratings` (table, line 554)
- `form_field_scans` (table, line 562)
- `form_field_signatures` (table, line 570)
- `form_fields` (table, line 579)
- `form_reviewer_rules` (table, line 600)
- `form_submission_files` (table, line 607)
- `form_submission_reviewers` (table, line 616)
- `form_submissions` (table, line 624)
- `forms` (table, line 632)
- `section_templates` (table, line 1548)

### inventory-finance

Inventory, purchasing, payments, budgets, expenses, labor, and sales data.

Objects: 38

- `budgets` (table, line 87)
- `expenses` (table, line 512)
- `inv_adjustments` (table, line 762)
- `inv_count_events` (table, line 777)
- `inv_count_lines` (table, line 783)
- `inv_count_locations` (table, line 798)
- `inv_count_scans` (table, line 804)
- `inv_counts` (table, line 810)
- `inv_item_units` (table, line 820)
- `inv_items` (table, line 831)
- `inv_locations` (table, line 852)
- `inv_par_overrides` (table, line 862)
- `inv_par_profiles` (table, line 872)
- `inv_prep_batches` (table, line 884)
- `inv_prep_plans` (table, line 900)
- `inv_production_approvals` (table, line 906)
- `inv_production_events` (table, line 912)
- `inv_production_materials` (table, line 920)
- `inv_purchase_lines` (table, line 926)
- `inv_purchases` (table, line 938)
- `inv_recipes` (table, line 956)
- `inv_stock_lots` (table, line 966)
- `inv_suppliers` (table, line 979)
- `inv_transfer_audit` (table, line 993)
- `inv_transfer_items` (table, line 999)
- `inv_transfers` (table, line 1005)
- `inv_units` (table, line 1013)
- `inv_waste` (table, line 1027)
- `inventory_categories` (table, line 1039)
- `inventory_items` (table, line 1047)
- `inventory_transactions` (table, line 1066)
- `investment_plans` (table, line 1077)
- `labor_entries` (table, line 1105)
- `payment_approvals` (table, line 1288)
- `payments` (table, line 1296)
- `purchase_order_items` (table, line 1384)
- `purchase_orders` (table, line 1394)
- `sales_ledger` (table, line 1480)

### learning-recognition-gamification

Learning, training, badges, recognition, goals, and gamification.

Objects: 23

- `badge_catalog` (table, line 75)
- `certification_catalog` (table, line 118)
- `certification_progress` (table, line 131)
- `certifications` (table, line 148)
- `gamification_leaderboard` (table, line 646)
- `gamification_xp` (table, line 661)
- `goal_milestones` (table, line 668)
- `goal_participants` (table, line 679)
- `goal_rewards` (table, line 687)
- `goal_tasks` (table, line 696)
- `goals` (table, line 703)
- `learning_completions` (table, line 1111)
- `learning_course_progress` (table, line 1125)
- `learning_courses` (table, line 1137)
- `learning_enrollments` (table, line 1159)
- `learning_progress` (table, line 1168)
- `learning_progress_events` (table, line 1174)
- `recognition_award_rules` (table, line 1410)
- `recognition_events` (table, line 1421)
- `training_assignments` (table, line 1744)
- `training_modules` (table, line 1758)
- `v_training_completion_events` (table, line 1811)
- `recognitions` (view, line 1914)

### analytics-operations-copilot

Analytics, operations, reports, workflow, ideas, OODA, and copilot data.

Objects: 29

- `analytics_cache` (table, line 13)
- `app_rule_audits` (table, line 39)
- `app_rules` (table, line 45)
- `codex_auto_tasks` (table, line 163)
- `copilot_action_events` (table, line 317)
- `copilot_actions` (table, line 331)
- `coverage_templates` (table, line 358)
- `custom_reports` (table, line 364)
- `daily_insights` (table, line 408)
- `helpdesk_tickets` (table, line 719)
- `idea_actions` (table, line 741)
- `idea_cycles` (table, line 752)
- `kpi_insights` (table, line 1091)
- `ooda_cycles` (table, line 1211)
- `ooda_responses` (table, line 1223)
- `operations_checklists` (table, line 1232)
- `operations_tasks` (table, line 1238)
- `ops_automation_suggestions` (table, line 1244)
- `ops_issues` (table, line 1256)
- `ops_kpi_snapshots` (table, line 1270)
- `report_events` (table, line 1455)
- `report_schedules` (table, line 1465)
- `task_activities` (table, line 1655)
- `task_comments` (table, line 1664)
- `task_workflow_instances` (table, line 1683)
- `tasks` (table, line 1693)
- `workflow_step_instances` (table, line 1858)
- `workflow_steps` (table, line 1869)
- `workflows` (table, line 1884)

### system-internal

Migration artifacts and implementation details that should not be client-owned.

Objects: 1

- `supabase_migrations` (table, line 1631)

### unclassified

Objects that need a human domain decision before the restore migration can be split.

- None

## Blockers To Remove During Domain Replacement

### Placeholder Views

- `calendar_events_full` (scheduling-calendar, line 1900)
- `calendar_unified_view` (scheduling-calendar, line 1907)
- `recognitions` (learning-recognition-gamification, line 1914)
- `vendor_event` (scheduling-calendar, line 1921)

### Empty Table Shells

- `company_members` (core-tenant-auth, line 210)
- `supabase_migrations` (system-internal, line 1631)

### Broad Grants And Default Privileges

- line 1929: `grant select on all tables in schema public to anon;`
- line 1931: `grant select, insert, update, delete on all tables in schema public to authenticated;`
- line 1933: `grant all on all tables in schema public to service_role;`
- line 1935: `grant all on all sequences in schema public to authenticated, service_role;`
- line 1941: `alter default privileges in schema public grant select on tables to anon;`
- line 1943: `alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;`
- line 1945: `alter default privileges in schema public grant all on tables to service_role;`

## Phase 17 Decision

- Do not edit the already-applied restore migration in place for production.
- Create forward domain migrations that replace placeholder views, add missing constraints, and move generic grants to explicit table policies.
- Use this inventory as the checklist for replacing restore-migration ownership one domain at a time.
- Keep release-gates and deploy-readiness green after each domain migration.

