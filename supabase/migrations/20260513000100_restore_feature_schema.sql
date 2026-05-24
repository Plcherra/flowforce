-- Restores the feature-schema surface expected by the FlowForce app.

-- This migration is intentionally non-destructive: it creates missing tables/views

-- and adds missing columns without dropping existing data.

create extension if not exists pgcrypto with schema extensions;

create extension if not exists citext with schema extensions;



create table if not exists public."analytics_cache" (id uuid primary key default gen_random_uuid());
alter table public."analytics_cache" add column if not exists "cache_key" text;
alter table public."analytics_cache" add column if not exists "created_at" timestamptz default now();
alter table public."analytics_cache" add column if not exists "data" jsonb;
alter table public."analytics_cache" add column if not exists "expires_at" timestamptz;

create table if not exists public."announcement_reads" (id uuid primary key default gen_random_uuid());
alter table public."announcement_reads" add column if not exists "announcement_id" text;
alter table public."announcement_reads" add column if not exists "read_at" timestamptz;
alter table public."announcement_reads" add column if not exists "user_id" uuid;
create index if not exists "announcement_reads_user_id_idx" on public."announcement_reads" ("user_id");

create table if not exists public."announcements" (id uuid primary key default gen_random_uuid());
alter table public."announcements" add column if not exists "company_id" uuid;
alter table public."announcements" add column if not exists "content" text;
alter table public."announcements" add column if not exists "created_at" timestamptz default now();
alter table public."announcements" add column if not exists "created_by" uuid;
alter table public."announcements" add column if not exists "expires_at" timestamptz;
alter table public."announcements" add column if not exists "is_published" boolean;
alter table public."announcements" add column if not exists "priority" text;
alter table public."announcements" add column if not exists "target_audience" text;
alter table public."announcements" add column if not exists "target_ids" jsonb;
alter table public."announcements" add column if not exists "title" text;
alter table public."announcements" add column if not exists "updated_at" timestamptz default now();
create index if not exists "announcements_company_id_idx" on public."announcements" ("company_id");

create table if not exists public."app_rule_audits" (id uuid primary key default gen_random_uuid());
alter table public."app_rule_audits" add column if not exists "company_id" uuid;
alter table public."app_rule_audits" add column if not exists "created_at" timestamptz default now();
alter table public."app_rule_audits" add column if not exists "updated_at" timestamptz default now();
create index if not exists "app_rule_audits_company_id_idx" on public."app_rule_audits" ("company_id");

create table if not exists public."app_rules" (id uuid primary key default gen_random_uuid());
alter table public."app_rules" add column if not exists "company_id" uuid;
alter table public."app_rules" add column if not exists "created_at" timestamptz default now();
alter table public."app_rules" add column if not exists "updated_at" timestamptz default now();
create index if not exists "app_rules_company_id_idx" on public."app_rules" ("company_id");

create table if not exists public."attachments" (id uuid primary key default gen_random_uuid());
alter table public."attachments" add column if not exists "company_id" uuid;
alter table public."attachments" add column if not exists "created_at" timestamptz default now();
alter table public."attachments" add column if not exists "updated_at" timestamptz default now();
create index if not exists "attachments_company_id_idx" on public."attachments" ("company_id");

create table if not exists public."audit_log" (id uuid primary key default gen_random_uuid());
alter table public."audit_log" add column if not exists "company_id" uuid;
alter table public."audit_log" add column if not exists "created_at" timestamptz default now();
alter table public."audit_log" add column if not exists "updated_at" timestamptz default now();
create index if not exists "audit_log_company_id_idx" on public."audit_log" ("company_id");

create table if not exists public."availability_exception" (id uuid primary key default gen_random_uuid());
alter table public."availability_exception" add column if not exists "company_id" uuid;
alter table public."availability_exception" add column if not exists "created_at" timestamptz default now();
alter table public."availability_exception" add column if not exists "updated_at" timestamptz default now();
create index if not exists "availability_exception_company_id_idx" on public."availability_exception" ("company_id");

create table if not exists public."availability_request" (id uuid primary key default gen_random_uuid());
alter table public."availability_request" add column if not exists "company_id" uuid;
alter table public."availability_request" add column if not exists "created_at" timestamptz default now();
alter table public."availability_request" add column if not exists "updated_at" timestamptz default now();
create index if not exists "availability_request_company_id_idx" on public."availability_request" ("company_id");

create table if not exists public."badge_catalog" (id uuid primary key default gen_random_uuid());
alter table public."badge_catalog" add column if not exists "company_id" uuid;
alter table public."badge_catalog" add column if not exists "created_at" timestamptz default now();
alter table public."badge_catalog" add column if not exists "updated_at" timestamptz default now();
alter table public."badge_catalog" add column if not exists "code" text;
alter table public."badge_catalog" add column if not exists "title" text;
alter table public."badge_catalog" add column if not exists "description" text;
alter table public."badge_catalog" add column if not exists "icon" text;
alter table public."badge_catalog" add column if not exists "min_level" numeric;
alter table public."badge_catalog" add column if not exists "role" text;
create index if not exists "badge_catalog_company_id_idx" on public."badge_catalog" ("company_id");

create table if not exists public."budgets" (id uuid primary key default gen_random_uuid());
alter table public."budgets" add column if not exists "amount" numeric;
alter table public."budgets" add column if not exists "created_at" timestamptz default now();
alter table public."budgets" add column if not exists "name" text;
alter table public."budgets" add column if not exists "period_end" date;
alter table public."budgets" add column if not exists "period_start" date;
alter table public."budgets" add column if not exists "updated_at" timestamptz default now();
alter table public."budgets" add column if not exists "user_id" uuid;
create index if not exists "budgets_user_id_idx" on public."budgets" ("user_id");

create table if not exists public."calendar_events" (id uuid primary key default gen_random_uuid());
alter table public."calendar_events" add column if not exists "attendees" jsonb;
alter table public."calendar_events" add column if not exists "checklist" jsonb;
alter table public."calendar_events" add column if not exists "color" text;
alter table public."calendar_events" add column if not exists "company_id" uuid;
alter table public."calendar_events" add column if not exists "created_at" timestamptz default now();
alter table public."calendar_events" add column if not exists "created_by" uuid;
alter table public."calendar_events" add column if not exists "description" text;
alter table public."calendar_events" add column if not exists "end_time" timestamptz;
alter table public."calendar_events" add column if not exists "event_type" text;
alter table public."calendar_events" add column if not exists "location" text;
alter table public."calendar_events" add column if not exists "metadata" jsonb;
alter table public."calendar_events" add column if not exists "related_shift_id" text;
alter table public."calendar_events" add column if not exists "related_shift_ids" jsonb;
alter table public."calendar_events" add column if not exists "start_time" timestamptz;
alter table public."calendar_events" add column if not exists "store_id" text;
alter table public."calendar_events" add column if not exists "title" text;
alter table public."calendar_events" add column if not exists "updated_at" timestamptz default now();
alter table public."calendar_events" add column if not exists "vendor" jsonb;
create index if not exists "calendar_events_company_id_idx" on public."calendar_events" ("company_id");

create table if not exists public."certification_catalog" (id uuid primary key default gen_random_uuid());
alter table public."certification_catalog" add column if not exists "title" text;
alter table public."certification_catalog" add column if not exists "unlocks_role" text;
alter table public."certification_catalog" add column if not exists "badge_code" text;
alter table public."certification_catalog" add column if not exists "code" text;
alter table public."certification_catalog" add column if not exists "created_at" timestamptz default now();
alter table public."certification_catalog" add column if not exists "description" text;
alter table public."certification_catalog" add column if not exists "issuer" text;
alter table public."certification_catalog" add column if not exists "linked_course_id" text;
alter table public."certification_catalog" add column if not exists "requirement_config" jsonb;
alter table public."certification_catalog" add column if not exists "updated_at" timestamptz default now();
alter table public."certification_catalog" add column if not exists "xp_reward" numeric;

create table if not exists public."certification_progress" (id uuid primary key default gen_random_uuid());
alter table public."certification_progress" add column if not exists "achieved_at" timestamptz;
alter table public."certification_progress" add column if not exists "certification_code" text;
alter table public."certification_progress" add column if not exists "courses_completed" numeric;
alter table public."certification_progress" add column if not exists "created_at" timestamptz default now();
alter table public."certification_progress" add column if not exists "employee_id" uuid;
alter table public."certification_progress" add column if not exists "expires_at" timestamptz;
alter table public."certification_progress" add column if not exists "goals_completed" numeric;
alter table public."certification_progress" add column if not exists "last_evaluated_at" timestamptz;
alter table public."certification_progress" add column if not exists "progress_percent" numeric;
alter table public."certification_progress" add column if not exists "requirement_breakdown" jsonb;
alter table public."certification_progress" add column if not exists "status" text;
alter table public."certification_progress" add column if not exists "tasks_completed" numeric;
alter table public."certification_progress" add column if not exists "updated_at" timestamptz default now();
alter table public."certification_progress" add column if not exists "xp_earned" numeric;
create index if not exists "certification_progress_employee_id_idx" on public."certification_progress" ("employee_id");

create table if not exists public."certifications" (id uuid primary key default gen_random_uuid());
alter table public."certifications" add column if not exists "company_id" uuid;
alter table public."certifications" add column if not exists "created_at" timestamptz default now();
alter table public."certifications" add column if not exists "description" text;
alter table public."certifications" add column if not exists "name" text;
create index if not exists "certifications_company_id_idx" on public."certifications" ("company_id");

create table if not exists public."channel_members" (id uuid primary key default gen_random_uuid());
alter table public."channel_members" add column if not exists "channel_id" text;
alter table public."channel_members" add column if not exists "joined_at" timestamptz;
alter table public."channel_members" add column if not exists "last_read_at" timestamptz;
alter table public."channel_members" add column if not exists "role" text;
alter table public."channel_members" add column if not exists "user_id" uuid;
create index if not exists "channel_members_user_id_idx" on public."channel_members" ("user_id");

create table if not exists public."codex_auto_tasks" (id uuid primary key default gen_random_uuid());
alter table public."codex_auto_tasks" add column if not exists "company_id" uuid;
alter table public."codex_auto_tasks" add column if not exists "created_at" timestamptz default now();
alter table public."codex_auto_tasks" add column if not exists "updated_at" timestamptz default now();
create index if not exists "codex_auto_tasks_company_id_idx" on public."codex_auto_tasks" ("company_id");

create table if not exists public."companies" (id uuid primary key default gen_random_uuid());
alter table public."companies" add column if not exists "created_at" timestamptz default now();
alter table public."companies" add column if not exists "created_by" uuid;
alter table public."companies" add column if not exists "currency" text;
alter table public."companies" add column if not exists "custom_roles" jsonb;
alter table public."companies" add column if not exists "description" text;
alter table public."companies" add column if not exists "enabled_sections" jsonb;
alter table public."companies" add column if not exists "industry" text;
alter table public."companies" add column if not exists "logo_url" text;
alter table public."companies" add column if not exists "name" text;
alter table public."companies" add column if not exists "owner_id" uuid;
alter table public."companies" add column if not exists "phone" text;
alter table public."companies" add column if not exists "positions" jsonb;
alter table public."companies" add column if not exists "primary_color" text;
alter table public."companies" add column if not exists "registration_complete" boolean;
alter table public."companies" add column if not exists "secondary_color" text;
alter table public."companies" add column if not exists "size" text;
alter table public."companies" add column if not exists "template_config" jsonb;
alter table public."companies" add column if not exists "template_id" text;
alter table public."companies" add column if not exists "template_name" text;
alter table public."companies" add column if not exists "timezone" text;
alter table public."companies" add column if not exists "updated_at" timestamptz default now();
alter table public."companies" add column if not exists "website" text;
alter table public."companies" add column if not exists "working_hours" jsonb;

create table if not exists public."company_invites" (id uuid primary key default gen_random_uuid());
alter table public."company_invites" add column if not exists "accepted_at" timestamptz;
alter table public."company_invites" add column if not exists "birth_date" date;
alter table public."company_invites" add column if not exists "company_id" uuid;
alter table public."company_invites" add column if not exists "created_at" timestamptz default now();
alter table public."company_invites" add column if not exists "email" text;
alter table public."company_invites" add column if not exists "expires_at" timestamptz;
alter table public."company_invites" add column if not exists "first_name" text;
alter table public."company_invites" add column if not exists "invite_token" text;
alter table public."company_invites" add column if not exists "invited_by" uuid;
alter table public."company_invites" add column if not exists "last_name" text;
alter table public."company_invites" add column if not exists "phone" text;
alter table public."company_invites" add column if not exists "role" text;
alter table public."company_invites" add column if not exists "status" text;
create index if not exists "company_invites_company_id_idx" on public."company_invites" ("company_id");

create table if not exists public."company_members" ();
alter table public."company_members" add column if not exists "added_at" timestamptz;
alter table public."company_members" add column if not exists "company_id" uuid;
alter table public."company_members" add column if not exists "role" text;
alter table public."company_members" add column if not exists "user_id" uuid;
create index if not exists "company_members_company_id_idx" on public."company_members" ("company_id");
create index if not exists "company_members_user_id_idx" on public."company_members" ("user_id");

create table if not exists public."company_roles" (id uuid primary key default gen_random_uuid());
alter table public."company_roles" add column if not exists "color" text;
alter table public."company_roles" add column if not exists "company_id" uuid;
alter table public."company_roles" add column if not exists "created_at" timestamptz default now();
alter table public."company_roles" add column if not exists "created_by" uuid;
alter table public."company_roles" add column if not exists "description" text;
alter table public."company_roles" add column if not exists "hierarchy_level" numeric;
alter table public."company_roles" add column if not exists "icon" text;
alter table public."company_roles" add column if not exists "is_active" boolean;
alter table public."company_roles" add column if not exists "is_system_role" boolean;
alter table public."company_roles" add column if not exists "name" text;
alter table public."company_roles" add column if not exists "permissions" jsonb;
alter table public."company_roles" add column if not exists "updated_at" timestamptz default now();
create index if not exists "company_roles_company_id_idx" on public."company_roles" ("company_id");

create table if not exists public."company_settings" (id uuid primary key default gen_random_uuid());
alter table public."company_settings" add column if not exists "company_id" uuid;
alter table public."company_settings" add column if not exists "company_name" text;
alter table public."company_settings" add column if not exists "created_at" timestamptz default now();
alter table public."company_settings" add column if not exists "logo_url" text;
alter table public."company_settings" add column if not exists "primary_color" text;
alter table public."company_settings" add column if not exists "secondary_color" text;
alter table public."company_settings" add column if not exists "timezone" text;
alter table public."company_settings" add column if not exists "updated_at" timestamptz default now();
alter table public."company_settings" add column if not exists "working_hours" jsonb;
create index if not exists "company_settings_company_id_idx" on public."company_settings" ("company_id");

create table if not exists public."company_update_comments" (id uuid primary key default gen_random_uuid());
alter table public."company_update_comments" add column if not exists "author_id" uuid;
alter table public."company_update_comments" add column if not exists "company_id" uuid;
alter table public."company_update_comments" add column if not exists "content" text;
alter table public."company_update_comments" add column if not exists "created_at" timestamptz default now();
alter table public."company_update_comments" add column if not exists "likes_count" numeric;
alter table public."company_update_comments" add column if not exists "update_id" text;
alter table public."company_update_comments" add column if not exists "updated_at" timestamptz default now();
create index if not exists "company_update_comments_company_id_idx" on public."company_update_comments" ("company_id");

create table if not exists public."company_update_engagement" (id uuid primary key default gen_random_uuid());
alter table public."company_update_engagement" add column if not exists "ai_summary" text;
alter table public."company_update_engagement" add column if not exists "comments_count" numeric;
alter table public."company_update_engagement" add column if not exists "company_id" uuid;
alter table public."company_update_engagement" add column if not exists "created_at" timestamptz default now();
alter table public."company_update_engagement" add column if not exists "engagement_score" numeric;
alter table public."company_update_engagement" add column if not exists "last_analyzed" text;
alter table public."company_update_engagement" add column if not exists "likes_count" numeric;
alter table public."company_update_engagement" add column if not exists "sentiment_score" numeric;
alter table public."company_update_engagement" add column if not exists "update_id" text;
alter table public."company_update_engagement" add column if not exists "updated_at" timestamptz default now();
alter table public."company_update_engagement" add column if not exists "views_count" numeric;
create index if not exists "company_update_engagement_company_id_idx" on public."company_update_engagement" ("company_id");

create table if not exists public."company_update_reactions" (id uuid primary key default gen_random_uuid());
alter table public."company_update_reactions" add column if not exists "company_id" uuid;
alter table public."company_update_reactions" add column if not exists "created_at" timestamptz default now();
alter table public."company_update_reactions" add column if not exists "reaction_type" text;
alter table public."company_update_reactions" add column if not exists "update_id" text;
alter table public."company_update_reactions" add column if not exists "user_id" uuid;
create index if not exists "company_update_reactions_company_id_idx" on public."company_update_reactions" ("company_id");
create index if not exists "company_update_reactions_user_id_idx" on public."company_update_reactions" ("user_id");

create table if not exists public."company_updates" (id uuid primary key default gen_random_uuid());
alter table public."company_updates" add column if not exists "assigned_employees" jsonb;
alter table public."company_updates" add column if not exists "author_avatar" text;
alter table public."company_updates" add column if not exists "author_id" uuid;
alter table public."company_updates" add column if not exists "author_name" text;
alter table public."company_updates" add column if not exists "author_role" text;
alter table public."company_updates" add column if not exists "background_style" jsonb;
alter table public."company_updates" add column if not exists "body" text;
alter table public."company_updates" add column if not exists "comments_count" numeric;
alter table public."company_updates" add column if not exists "company_id" uuid;
alter table public."company_updates" add column if not exists "created_at" timestamptz default now();
alter table public."company_updates" add column if not exists "created_by" uuid;
alter table public."company_updates" add column if not exists "is_pinned" boolean;
alter table public."company_updates" add column if not exists "likes_count" numeric;
alter table public."company_updates" add column if not exists "priority" text;
alter table public."company_updates" add column if not exists "publish_date" date;
alter table public."company_updates" add column if not exists "publishing_settings" jsonb;
alter table public."company_updates" add column if not exists "recipients" jsonb;
alter table public."company_updates" add column if not exists "rich_content" text;
alter table public."company_updates" add column if not exists "scheduled_date" date;
alter table public."company_updates" add column if not exists "status" text;
alter table public."company_updates" add column if not exists "title" text;
alter table public."company_updates" add column if not exists "update_type" text;
alter table public."company_updates" add column if not exists "updated_at" timestamptz default now();
alter table public."company_updates" add column if not exists "views_count" numeric;
create index if not exists "company_updates_company_id_idx" on public."company_updates" ("company_id");

create table if not exists public."compliance_rules" (id uuid primary key default gen_random_uuid());
alter table public."compliance_rules" add column if not exists "company_id" uuid;
alter table public."compliance_rules" add column if not exists "created_at" timestamptz default now();
alter table public."compliance_rules" add column if not exists "created_by" uuid;
alter table public."compliance_rules" add column if not exists "description" text;
alter table public."compliance_rules" add column if not exists "is_active" boolean;
alter table public."compliance_rules" add column if not exists "role" text;
alter table public."compliance_rules" add column if not exists "rule_type" text;
alter table public."compliance_rules" add column if not exists "updated_at" timestamptz default now();
alter table public."compliance_rules" add column if not exists "value" numeric;
create index if not exists "compliance_rules_company_id_idx" on public."compliance_rules" ("company_id");

create table if not exists public."copilot_action_events" (id uuid primary key default gen_random_uuid());
alter table public."copilot_action_events" add column if not exists "actor_user_id" text;
alter table public."copilot_action_events" add column if not exists "company_id" uuid;
alter table public."copilot_action_events" add column if not exists "copilot_action_id" text;
alter table public."copilot_action_events" add column if not exists "created_at" timestamptz default now();
alter table public."copilot_action_events" add column if not exists "dedupe_key" text;
alter table public."copilot_action_events" add column if not exists "event_type" text;
alter table public."copilot_action_events" add column if not exists "notes" text;
alter table public."copilot_action_events" add column if not exists "occurred_at" timestamptz;
alter table public."copilot_action_events" add column if not exists "payload" jsonb;
alter table public."copilot_action_events" add column if not exists "payload_hash" text;
alter table public."copilot_action_events" add column if not exists "status" text;
create index if not exists "copilot_action_events_company_id_idx" on public."copilot_action_events" ("company_id");

create table if not exists public."copilot_actions" (id uuid primary key default gen_random_uuid());
alter table public."copilot_actions" add column if not exists "action_type" text;
alter table public."copilot_actions" add column if not exists "actor_role" text;
alter table public."copilot_actions" add column if not exists "actor_user_id" text;
alter table public."copilot_actions" add column if not exists "approved_at" timestamptz;
alter table public."copilot_actions" add column if not exists "approved_by" uuid;
alter table public."copilot_actions" add column if not exists "company_id" uuid;
alter table public."copilot_actions" add column if not exists "completed_at" timestamptz;
alter table public."copilot_actions" add column if not exists "created_at" timestamptz default now();
alter table public."copilot_actions" add column if not exists "dedupe_key" text;
alter table public."copilot_actions" add column if not exists "dispatch_started_at" timestamptz;
alter table public."copilot_actions" add column if not exists "evaluation" jsonb;
alter table public."copilot_actions" add column if not exists "failed_at" timestamptz;
alter table public."copilot_actions" add column if not exists "failure_reason" text;
alter table public."copilot_actions" add column if not exists "metadata" jsonb;
alter table public."copilot_actions" add column if not exists "metrics" jsonb;
alter table public."copilot_actions" add column if not exists "payload" jsonb;
alter table public."copilot_actions" add column if not exists "priority" numeric;
alter table public."copilot_actions" add column if not exists "queued_at" timestamptz;
alter table public."copilot_actions" add column if not exists "recommendation" jsonb;
alter table public."copilot_actions" add column if not exists "source" text;
alter table public."copilot_actions" add column if not exists "status" text;
alter table public."copilot_actions" add column if not exists "target_ref" text;
alter table public."copilot_actions" add column if not exists "target_type" text;
alter table public."copilot_actions" add column if not exists "updated_at" timestamptz default now();
create index if not exists "copilot_actions_company_id_idx" on public."copilot_actions" ("company_id");

create table if not exists public."coverage_templates" (id uuid primary key default gen_random_uuid());
alter table public."coverage_templates" add column if not exists "company_id" uuid;
alter table public."coverage_templates" add column if not exists "created_at" timestamptz default now();
alter table public."coverage_templates" add column if not exists "updated_at" timestamptz default now();
create index if not exists "coverage_templates_company_id_idx" on public."coverage_templates" ("company_id");

create table if not exists public."custom_reports" (id uuid primary key default gen_random_uuid());
alter table public."custom_reports" add column if not exists "chart_config" jsonb;
alter table public."custom_reports" add column if not exists "columns" jsonb;
alter table public."custom_reports" add column if not exists "created_at" timestamptz default now();
alter table public."custom_reports" add column if not exists "created_by" uuid;
alter table public."custom_reports" add column if not exists "description" text;
alter table public."custom_reports" add column if not exists "filters" jsonb;
alter table public."custom_reports" add column if not exists "is_public" boolean;
alter table public."custom_reports" add column if not exists "name" text;
alter table public."custom_reports" add column if not exists "report_type" text;
alter table public."custom_reports" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."custom_section_pages" (id uuid primary key default gen_random_uuid());
alter table public."custom_section_pages" add column if not exists "content" jsonb;
alter table public."custom_section_pages" add column if not exists "created_at" timestamptz default now();
alter table public."custom_section_pages" add column if not exists "description" text;
alter table public."custom_section_pages" add column if not exists "icon" text;
alter table public."custom_section_pages" add column if not exists "is_active" boolean;
alter table public."custom_section_pages" add column if not exists "name" text;
alter table public."custom_section_pages" add column if not exists "permissions" jsonb;
alter table public."custom_section_pages" add column if not exists "route" text;
alter table public."custom_section_pages" add column if not exists "section_id" text;
alter table public."custom_section_pages" add column if not exists "sort_order" numeric;
alter table public."custom_section_pages" add column if not exists "title" text;
alter table public."custom_section_pages" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."custom_sections" (id uuid primary key default gen_random_uuid());
alter table public."custom_sections" add column if not exists "category" text;
alter table public."custom_sections" add column if not exists "company_id" uuid;
alter table public."custom_sections" add column if not exists "created_at" timestamptz default now();
alter table public."custom_sections" add column if not exists "created_by" uuid;
alter table public."custom_sections" add column if not exists "description" text;
alter table public."custom_sections" add column if not exists "icon" text;
alter table public."custom_sections" add column if not exists "is_active" boolean;
alter table public."custom_sections" add column if not exists "is_template" boolean;
alter table public."custom_sections" add column if not exists "name" text;
alter table public."custom_sections" add column if not exists "path" text;
alter table public."custom_sections" add column if not exists "permissions" jsonb;
alter table public."custom_sections" add column if not exists "sort_order" numeric;
alter table public."custom_sections" add column if not exists "template_config" jsonb;
alter table public."custom_sections" add column if not exists "template_id" text;
alter table public."custom_sections" add column if not exists "updated_at" timestamptz default now();
create index if not exists "custom_sections_company_id_idx" on public."custom_sections" ("company_id");

create table if not exists public."daily_insights" (id uuid primary key default gen_random_uuid());
alter table public."daily_insights" add column if not exists "company_id" uuid;
alter table public."daily_insights" add column if not exists "created_at" timestamptz default now();
alter table public."daily_insights" add column if not exists "updated_at" timestamptz default now();
alter table public."daily_insights" add column if not exists "insight_date" date;
alter table public."daily_insights" add column if not exists "collected_at" timestamptz;
alter table public."daily_insights" add column if not exists "total_shifts_worked" numeric;
alter table public."daily_insights" add column if not exists "open_tasks" numeric;
alter table public."daily_insights" add column if not exists "schedule_changes" numeric;
create index if not exists "daily_insights_company_id_idx" on public."daily_insights" ("company_id");

create table if not exists public."departments" (id uuid primary key default gen_random_uuid());
alter table public."departments" add column if not exists "company_id" uuid;
alter table public."departments" add column if not exists "created_at" timestamptz default now();
alter table public."departments" add column if not exists "description" text;
alter table public."departments" add column if not exists "manager_id" uuid;
alter table public."departments" add column if not exists "name" text;
alter table public."departments" add column if not exists "type" text;
alter table public."departments" add column if not exists "updated_at" timestamptz default now();
create index if not exists "departments_company_id_idx" on public."departments" ("company_id");

create table if not exists public."documents" (id uuid primary key default gen_random_uuid());
alter table public."documents" add column if not exists "company_id" uuid;
alter table public."documents" add column if not exists "created_at" timestamptz default now();
alter table public."documents" add column if not exists "updated_at" timestamptz default now();
create index if not exists "documents_company_id_idx" on public."documents" ("company_id");

create table if not exists public."employee_badge" (id uuid primary key default gen_random_uuid());
alter table public."employee_badge" add column if not exists "awarded_at" timestamptz;
alter table public."employee_badge" add column if not exists "awarded_by" text;
alter table public."employee_badge" add column if not exists "badge_code" text;
alter table public."employee_badge" add column if not exists "created_at" timestamptz default now();
alter table public."employee_badge" add column if not exists "employee_id" uuid;
alter table public."employee_badge" add column if not exists "reason" text;
create index if not exists "employee_badge_employee_id_idx" on public."employee_badge" ("employee_id");

create table if not exists public."employee_certifications" (id uuid primary key default gen_random_uuid());
alter table public."employee_certifications" add column if not exists "company_id" uuid;
alter table public."employee_certifications" add column if not exists "created_at" timestamptz default now();
alter table public."employee_certifications" add column if not exists "updated_at" timestamptz default now();
alter table public."employee_certifications" add column if not exists "employee_id" uuid;
alter table public."employee_certifications" add column if not exists "certification_id" text;
alter table public."employee_certifications" add column if not exists "awarded_by" text;
alter table public."employee_certifications" add column if not exists "awarded_at" timestamptz;
alter table public."employee_certifications" add column if not exists "expires_at" timestamptz;
alter table public."employee_certifications" add column if not exists "status" text;
create index if not exists "employee_certifications_company_id_idx" on public."employee_certifications" ("company_id");
create index if not exists "employee_certifications_employee_id_idx" on public."employee_certifications" ("employee_id");

create table if not exists public."employee_report" (id uuid primary key default gen_random_uuid());
alter table public."employee_report" add column if not exists "category" text;
alter table public."employee_report" add column if not exists "created_at" timestamptz default now();
alter table public."employee_report" add column if not exists "created_by" uuid;
alter table public."employee_report" add column if not exists "date" date;
alter table public."employee_report" add column if not exists "employee_id" uuid;
alter table public."employee_report" add column if not exists "notes" text;
alter table public."employee_report" add column if not exists "severity" numeric;
alter table public."employee_report" add column if not exists "updated_at" timestamptz default now();
create index if not exists "employee_report_employee_id_idx" on public."employee_report" ("employee_id");

create table if not exists public."employee_report_summary" (id uuid primary key default gen_random_uuid());
alter table public."employee_report_summary" add column if not exists "company_id" uuid;
alter table public."employee_report_summary" add column if not exists "created_at" timestamptz default now();
alter table public."employee_report_summary" add column if not exists "updated_at" timestamptz default now();
create index if not exists "employee_report_summary_company_id_idx" on public."employee_report_summary" ("company_id");

create table if not exists public."employees" (id uuid primary key default gen_random_uuid());
alter table public."employees" add column if not exists "company_id" uuid;
alter table public."employees" add column if not exists "created_at" timestamptz default now();
alter table public."employees" add column if not exists "updated_at" timestamptz default now();
create index if not exists "employees_company_id_idx" on public."employees" ("company_id");

create table if not exists public."engagement_scores" (id uuid primary key default gen_random_uuid());
alter table public."engagement_scores" add column if not exists "company_id" uuid;
alter table public."engagement_scores" add column if not exists "created_at" timestamptz default now();
alter table public."engagement_scores" add column if not exists "updated_at" timestamptz default now();
alter table public."engagement_scores" add column if not exists "period_start" date;
alter table public."engagement_scores" add column if not exists "period_end" date;
alter table public."engagement_scores" add column if not exists "recognition_count" numeric;
alter table public."engagement_scores" add column if not exists "checklist_completions" numeric;
alter table public."engagement_scores" add column if not exists "punctuality_score" numeric;
alter table public."engagement_scores" add column if not exists "engagement_score" numeric;
alter table public."engagement_scores" add column if not exists "calculated_at" timestamptz;
create index if not exists "engagement_scores_company_id_idx" on public."engagement_scores" ("company_id");

create table if not exists public."event_participants" (id uuid primary key default gen_random_uuid());
alter table public."event_participants" add column if not exists "event_id" text;
alter table public."event_participants" add column if not exists "profile_id" uuid;
alter table public."event_participants" add column if not exists "role" text;
alter table public."event_participants" add column if not exists "rsvp_status" text;

create table if not exists public."event_shift_links" (id uuid primary key default gen_random_uuid());
alter table public."event_shift_links" add column if not exists "company_id" uuid;
alter table public."event_shift_links" add column if not exists "created_at" timestamptz default now();
alter table public."event_shift_links" add column if not exists "event_id" text;
alter table public."event_shift_links" add column if not exists "shift_id" text;
create index if not exists "event_shift_links_company_id_idx" on public."event_shift_links" ("company_id");

create table if not exists public."events" (id uuid primary key default gen_random_uuid());
alter table public."events" add column if not exists "company_id" uuid;
alter table public."events" add column if not exists "created_at" timestamptz default now();
alter table public."events" add column if not exists "updated_at" timestamptz default now();
create index if not exists "events_company_id_idx" on public."events" ("company_id");

create table if not exists public."expenses" (id uuid primary key default gen_random_uuid());
alter table public."expenses" add column if not exists "amount" numeric;
alter table public."expenses" add column if not exists "approved_at" timestamptz;
alter table public."expenses" add column if not exists "approved_by" uuid;
alter table public."expenses" add column if not exists "category" text;
alter table public."expenses" add column if not exists "created_at" timestamptz default now();
alter table public."expenses" add column if not exists "created_by" uuid;
alter table public."expenses" add column if not exists "currency" text;
alter table public."expenses" add column if not exists "description" text;
alter table public."expenses" add column if not exists "employee_id" uuid;
alter table public."expenses" add column if not exists "expense_date" date;
alter table public."expenses" add column if not exists "notes" text;
alter table public."expenses" add column if not exists "payment_method" text;
alter table public."expenses" add column if not exists "receipt_url" text;
alter table public."expenses" add column if not exists "status" text;
alter table public."expenses" add column if not exists "updated_at" timestamptz default now();
create index if not exists "expenses_employee_id_idx" on public."expenses" ("employee_id");

create table if not exists public."files" (id uuid primary key default gen_random_uuid());
alter table public."files" add column if not exists "company_id" uuid;
alter table public."files" add column if not exists "created_at" timestamptz default now();
alter table public."files" add column if not exists "updated_at" timestamptz default now();
create index if not exists "files_company_id_idx" on public."files" ("company_id");

create table if not exists public."form_access_rules" (id uuid primary key default gen_random_uuid());
alter table public."form_access_rules" add column if not exists "created_at" timestamptz default now();
alter table public."form_access_rules" add column if not exists "created_by" uuid;
alter table public."form_access_rules" add column if not exists "form_id" text;
alter table public."form_access_rules" add column if not exists "rule_type" text;
alter table public."form_access_rules" add column if not exists "scope_id" text;
alter table public."form_access_rules" add column if not exists "scope_type" text;

create table if not exists public."form_field_locations" (id uuid primary key default gen_random_uuid());
alter table public."form_field_locations" add column if not exists "accuracy" numeric;
alter table public."form_field_locations" add column if not exists "address" text;
alter table public."form_field_locations" add column if not exists "altitude" numeric;
alter table public."form_field_locations" add column if not exists "created_at" timestamptz default now();
alter table public."form_field_locations" add column if not exists "field_id" text;
alter table public."form_field_locations" add column if not exists "latitude" numeric;
alter table public."form_field_locations" add column if not exists "longitude" numeric;
alter table public."form_field_locations" add column if not exists "submission_id" text;

create table if not exists public."form_field_ratings" (id uuid primary key default gen_random_uuid());
alter table public."form_field_ratings" add column if not exists "created_at" timestamptz default now();
alter table public."form_field_ratings" add column if not exists "field_id" text;
alter table public."form_field_ratings" add column if not exists "max_rating" numeric;
alter table public."form_field_ratings" add column if not exists "rating_type" text;
alter table public."form_field_ratings" add column if not exists "rating_value" numeric;
alter table public."form_field_ratings" add column if not exists "submission_id" text;

create table if not exists public."form_field_scans" (id uuid primary key default gen_random_uuid());
alter table public."form_field_scans" add column if not exists "created_at" timestamptz default now();
alter table public."form_field_scans" add column if not exists "field_id" text;
alter table public."form_field_scans" add column if not exists "scan_data" text;
alter table public."form_field_scans" add column if not exists "scan_format" text;
alter table public."form_field_scans" add column if not exists "scan_type" text;
alter table public."form_field_scans" add column if not exists "submission_id" text;

create table if not exists public."form_field_signatures" (id uuid primary key default gen_random_uuid());
alter table public."form_field_signatures" add column if not exists "created_at" timestamptz default now();
alter table public."form_field_signatures" add column if not exists "field_id" text;
alter table public."form_field_signatures" add column if not exists "signature_data" text;
alter table public."form_field_signatures" add column if not exists "signature_url" text;
alter table public."form_field_signatures" add column if not exists "signed_at" timestamptz;
alter table public."form_field_signatures" add column if not exists "signer_name" text;
alter table public."form_field_signatures" add column if not exists "submission_id" text;

create table if not exists public."form_fields" (id uuid primary key default gen_random_uuid());
alter table public."form_fields" add column if not exists "created_at" timestamptz default now();
alter table public."form_fields" add column if not exists "dependent_fields" jsonb;
alter table public."form_fields" add column if not exists "description" text;
alter table public."form_fields" add column if not exists "field_order" numeric;
alter table public."form_fields" add column if not exists "field_type" text;
alter table public."form_fields" add column if not exists "form_id" text;
alter table public."form_fields" add column if not exists "formula_expression" text;
alter table public."form_fields" add column if not exists "is_required" boolean;
alter table public."form_fields" add column if not exists "label" text;
alter table public."form_fields" add column if not exists "max_value" numeric;
alter table public."form_fields" add column if not exists "media_config" jsonb;
alter table public."form_fields" add column if not exists "min_value" numeric;
alter table public."form_fields" add column if not exists "options" jsonb;
alter table public."form_fields" add column if not exists "placeholder" text;
alter table public."form_fields" add column if not exists "rating_config" jsonb;
alter table public."form_fields" add column if not exists "scan_config" jsonb;
alter table public."form_fields" add column if not exists "step_value" numeric;
alter table public."form_fields" add column if not exists "updated_at" timestamptz default now();
alter table public."form_fields" add column if not exists "validation_rules" jsonb;

create table if not exists public."form_reviewer_rules" (id uuid primary key default gen_random_uuid());
alter table public."form_reviewer_rules" add column if not exists "created_at" timestamptz default now();
alter table public."form_reviewer_rules" add column if not exists "created_by" uuid;
alter table public."form_reviewer_rules" add column if not exists "form_id" text;
alter table public."form_reviewer_rules" add column if not exists "scope_id" text;
alter table public."form_reviewer_rules" add column if not exists "scope_type" text;

create table if not exists public."form_submission_files" (id uuid primary key default gen_random_uuid());
alter table public."form_submission_files" add column if not exists "created_at" timestamptz default now();
alter table public."form_submission_files" add column if not exists "field_id" text;
alter table public."form_submission_files" add column if not exists "file_name" text;
alter table public."form_submission_files" add column if not exists "file_size" numeric;
alter table public."form_submission_files" add column if not exists "file_type" text;
alter table public."form_submission_files" add column if not exists "storage_path" text;
alter table public."form_submission_files" add column if not exists "submission_id" text;

create table if not exists public."form_submission_reviewers" (id uuid primary key default gen_random_uuid());
alter table public."form_submission_reviewers" add column if not exists "assigned_user_id" text;
alter table public."form_submission_reviewers" add column if not exists "created_at" timestamptz default now();
alter table public."form_submission_reviewers" add column if not exists "note" text;
alter table public."form_submission_reviewers" add column if not exists "status" text;
alter table public."form_submission_reviewers" add column if not exists "submission_id" text;
alter table public."form_submission_reviewers" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."form_submissions" (id uuid primary key default gen_random_uuid());
alter table public."form_submissions" add column if not exists "form_id" text;
alter table public."form_submissions" add column if not exists "ip_address" text;
alter table public."form_submissions" add column if not exists "submission_data" jsonb;
alter table public."form_submissions" add column if not exists "submitted_at" timestamptz;
alter table public."form_submissions" add column if not exists "submitted_by" text;
alter table public."form_submissions" add column if not exists "user_agent" text;

create table if not exists public."forms" (id uuid primary key default gen_random_uuid());
alter table public."forms" add column if not exists "created_at" timestamptz default now();
alter table public."forms" add column if not exists "created_by" uuid;
alter table public."forms" add column if not exists "department_id" text;
alter table public."forms" add column if not exists "description" text;
alter table public."forms" add column if not exists "end_date" date;
alter table public."forms" add column if not exists "is_anonymous" boolean;
alter table public."forms" add column if not exists "max_submissions" numeric;
alter table public."forms" add column if not exists "settings" jsonb;
alter table public."forms" add column if not exists "start_date" date;
alter table public."forms" add column if not exists "status" text;
alter table public."forms" add column if not exists "title" text;
alter table public."forms" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."gamification_leaderboard" (id uuid primary key default gen_random_uuid());
alter table public."gamification_leaderboard" add column if not exists "company_id" uuid;
alter table public."gamification_leaderboard" add column if not exists "created_at" timestamptz default now();
alter table public."gamification_leaderboard" add column if not exists "updated_at" timestamptz default now();
alter table public."gamification_leaderboard" add column if not exists "employee_id" uuid;
alter table public."gamification_leaderboard" add column if not exists "period" text;
alter table public."gamification_leaderboard" add column if not exists "period_start" date;
alter table public."gamification_leaderboard" add column if not exists "total_xp" numeric;
alter table public."gamification_leaderboard" add column if not exists "rank" numeric;
alter table public."gamification_leaderboard" add column if not exists "challenges" jsonb;
alter table public."gamification_leaderboard" add column if not exists "last_challenge_triggered" timestamptz;
alter table public."gamification_leaderboard" add column if not exists "last_synced_at" timestamptz;
create index if not exists "gamification_leaderboard_company_id_idx" on public."gamification_leaderboard" ("company_id");
create index if not exists "gamification_leaderboard_employee_id_idx" on public."gamification_leaderboard" ("employee_id");

create table if not exists public."gamification_xp" (id uuid primary key default gen_random_uuid());
alter table public."gamification_xp" add column if not exists "amount" numeric;
alter table public."gamification_xp" add column if not exists "created_at" timestamptz default now();
alter table public."gamification_xp" add column if not exists "reason" text;
alter table public."gamification_xp" add column if not exists "user_id" uuid;
create index if not exists "gamification_xp_user_id_idx" on public."gamification_xp" ("user_id");

create table if not exists public."goal_milestones" (id uuid primary key default gen_random_uuid());
alter table public."goal_milestones" add column if not exists "completed_at" timestamptz;
alter table public."goal_milestones" add column if not exists "created_at" timestamptz default now();
alter table public."goal_milestones" add column if not exists "description" text;
alter table public."goal_milestones" add column if not exists "goal_id" text;
alter table public."goal_milestones" add column if not exists "progress" numeric;
alter table public."goal_milestones" add column if not exists "sort_order" numeric;
alter table public."goal_milestones" add column if not exists "target_date" date;
alter table public."goal_milestones" add column if not exists "title" text;
alter table public."goal_milestones" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."goal_participants" (id uuid primary key default gen_random_uuid());
alter table public."goal_participants" add column if not exists "contribution_score" numeric;
alter table public."goal_participants" add column if not exists "goal_id" text;
alter table public."goal_participants" add column if not exists "joined_at" timestamptz;
alter table public."goal_participants" add column if not exists "role" text;
alter table public."goal_participants" add column if not exists "user_id" uuid;
create index if not exists "goal_participants_user_id_idx" on public."goal_participants" ("user_id");

create table if not exists public."goal_rewards" (id uuid primary key default gen_random_uuid());
alter table public."goal_rewards" add column if not exists "awarded_at" timestamptz;
alter table public."goal_rewards" add column if not exists "created_by" uuid;
alter table public."goal_rewards" add column if not exists "goal_id" text;
alter table public."goal_rewards" add column if not exists "reward_details" jsonb;
alter table public."goal_rewards" add column if not exists "reward_type" text;
alter table public."goal_rewards" add column if not exists "user_id" uuid;
create index if not exists "goal_rewards_user_id_idx" on public."goal_rewards" ("user_id");

create table if not exists public."goal_tasks" (id uuid primary key default gen_random_uuid());
alter table public."goal_tasks" add column if not exists "created_at" timestamptz default now();
alter table public."goal_tasks" add column if not exists "goal_id" text;
alter table public."goal_tasks" add column if not exists "milestone_id" text;
alter table public."goal_tasks" add column if not exists "task_id" text;
alter table public."goal_tasks" add column if not exists "weight" numeric;

create table if not exists public."goals" (id uuid primary key default gen_random_uuid());
alter table public."goals" add column if not exists "company_id" uuid;
alter table public."goals" add column if not exists "completed_at" timestamptz;
alter table public."goals" add column if not exists "created_at" timestamptz default now();
alter table public."goals" add column if not exists "created_by" uuid;
alter table public."goals" add column if not exists "description" text;
alter table public."goals" add column if not exists "priority" text;
alter table public."goals" add column if not exists "progress" numeric;
alter table public."goals" add column if not exists "reward_details" jsonb;
alter table public."goals" add column if not exists "reward_type" text;
alter table public."goals" add column if not exists "status" text;
alter table public."goals" add column if not exists "target_completion_date" date;
alter table public."goals" add column if not exists "title" text;
alter table public."goals" add column if not exists "updated_at" timestamptz default now();
create index if not exists "goals_company_id_idx" on public."goals" ("company_id");

create table if not exists public."helpdesk_tickets" (id uuid primary key default gen_random_uuid());
alter table public."helpdesk_tickets" add column if not exists "assigned_to" uuid;
alter table public."helpdesk_tickets" add column if not exists "category" text;
alter table public."helpdesk_tickets" add column if not exists "company_id" uuid;
alter table public."helpdesk_tickets" add column if not exists "created_at" timestamptz default now();
alter table public."helpdesk_tickets" add column if not exists "department_id" text;
alter table public."helpdesk_tickets" add column if not exists "description" text;
alter table public."helpdesk_tickets" add column if not exists "priority" text;
alter table public."helpdesk_tickets" add column if not exists "requester_id" text;
alter table public."helpdesk_tickets" add column if not exists "status" text;
alter table public."helpdesk_tickets" add column if not exists "subject" text;
alter table public."helpdesk_tickets" add column if not exists "updated_at" timestamptz default now();
create index if not exists "helpdesk_tickets_company_id_idx" on public."helpdesk_tickets" ("company_id");

create table if not exists public."hr_roster_cache" (id uuid primary key default gen_random_uuid());
alter table public."hr_roster_cache" add column if not exists "company_id" uuid;
alter table public."hr_roster_cache" add column if not exists "created_at" timestamptz default now();
alter table public."hr_roster_cache" add column if not exists "updated_at" timestamptz default now();
alter table public."hr_roster_cache" add column if not exists "snapshot" jsonb;
alter table public."hr_roster_cache" add column if not exists "synced_at" timestamptz;
create index if not exists "hr_roster_cache_company_id_idx" on public."hr_roster_cache" ("company_id");

create table if not exists public."idea_actions" (id uuid primary key default gen_random_uuid());
alter table public."idea_actions" add column if not exists "company_id" uuid;
alter table public."idea_actions" add column if not exists "created_at" timestamptz default now();
alter table public."idea_actions" add column if not exists "updated_at" timestamptz default now();
alter table public."idea_actions" add column if not exists "org_id" text;
alter table public."idea_actions" add column if not exists "title" text;
alter table public."idea_actions" add column if not exists "description" text;
alter table public."idea_actions" add column if not exists "status" text;
alter table public."idea_actions" add column if not exists "metadata" jsonb;
create index if not exists "idea_actions_company_id_idx" on public."idea_actions" ("company_id");

create table if not exists public."idea_cycles" (id uuid primary key default gen_random_uuid());
alter table public."idea_cycles" add column if not exists "company_id" uuid;
alter table public."idea_cycles" add column if not exists "created_at" timestamptz default now();
alter table public."idea_cycles" add column if not exists "updated_at" timestamptz default now();
alter table public."idea_cycles" add column if not exists "org_id" text;
alter table public."idea_cycles" add column if not exists "title" text;
alter table public."idea_cycles" add column if not exists "status" text;
alter table public."idea_cycles" add column if not exists "metadata" jsonb;
create index if not exists "idea_cycles_company_id_idx" on public."idea_cycles" ("company_id");

create table if not exists public."inv_adjustments" (id uuid primary key default gen_random_uuid());
alter table public."inv_adjustments" add column if not exists "adjusted_by" text;
alter table public."inv_adjustments" add column if not exists "adjustment_date" date;
alter table public."inv_adjustments" add column if not exists "adjustment_type" text;
alter table public."inv_adjustments" add column if not exists "cost_impact" numeric;
alter table public."inv_adjustments" add column if not exists "created_at" timestamptz default now();
alter table public."inv_adjustments" add column if not exists "from_location_id" text;
alter table public."inv_adjustments" add column if not exists "item_id" text;
alter table public."inv_adjustments" add column if not exists "location_id" text;
alter table public."inv_adjustments" add column if not exists "lot_id" text;
alter table public."inv_adjustments" add column if not exists "quantity" numeric;
alter table public."inv_adjustments" add column if not exists "reason" text;
alter table public."inv_adjustments" add column if not exists "reference_number" text;
alter table public."inv_adjustments" add column if not exists "to_location_id" text;

create table if not exists public."inv_count_events" (id uuid primary key default gen_random_uuid());
alter table public."inv_count_events" add column if not exists "company_id" uuid;
alter table public."inv_count_events" add column if not exists "created_at" timestamptz default now();
alter table public."inv_count_events" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_count_events_company_id_idx" on public."inv_count_events" ("company_id");

create table if not exists public."inv_count_lines" (id uuid primary key default gen_random_uuid());
alter table public."inv_count_lines" add column if not exists "conversion_factor" numeric;
alter table public."inv_count_lines" add column if not exists "count_id" text;
alter table public."inv_count_lines" add column if not exists "counted_at" timestamptz;
alter table public."inv_count_lines" add column if not exists "counted_in_base_units" numeric;
alter table public."inv_count_lines" add column if not exists "counted_quantity" numeric;
alter table public."inv_count_lines" add column if not exists "expected_quantity" numeric;
alter table public."inv_count_lines" add column if not exists "item_id" text;
alter table public."inv_count_lines" add column if not exists "lot_id" text;
alter table public."inv_count_lines" add column if not exists "notes" text;
alter table public."inv_count_lines" add column if not exists "notes_per_unit" jsonb;
alter table public."inv_count_lines" add column if not exists "unit_id" text;
alter table public."inv_count_lines" add column if not exists "unit_level" numeric;
alter table public."inv_count_lines" add column if not exists "variance" numeric;

create table if not exists public."inv_count_locations" (id uuid primary key default gen_random_uuid());
alter table public."inv_count_locations" add column if not exists "company_id" uuid;
alter table public."inv_count_locations" add column if not exists "created_at" timestamptz default now();
alter table public."inv_count_locations" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_count_locations_company_id_idx" on public."inv_count_locations" ("company_id");

create table if not exists public."inv_count_scans" (id uuid primary key default gen_random_uuid());
alter table public."inv_count_scans" add column if not exists "company_id" uuid;
alter table public."inv_count_scans" add column if not exists "created_at" timestamptz default now();
alter table public."inv_count_scans" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_count_scans_company_id_idx" on public."inv_count_scans" ("company_id");

create table if not exists public."inv_counts" (id uuid primary key default gen_random_uuid());
alter table public."inv_counts" add column if not exists "completed_at" timestamptz;
alter table public."inv_counts" add column if not exists "count_date" date;
alter table public."inv_counts" add column if not exists "count_type" text;
alter table public."inv_counts" add column if not exists "counted_by" text;
alter table public."inv_counts" add column if not exists "created_at" timestamptz default now();
alter table public."inv_counts" add column if not exists "location_id" text;
alter table public."inv_counts" add column if not exists "notes" text;
alter table public."inv_counts" add column if not exists "status" text;

create table if not exists public."inv_item_units" (id uuid primary key default gen_random_uuid());
alter table public."inv_item_units" add column if not exists "conversion_factor" numeric;
alter table public."inv_item_units" add column if not exists "cost_per_unit" numeric;
alter table public."inv_item_units" add column if not exists "created_at" timestamptz default now();
alter table public."inv_item_units" add column if not exists "is_countable" boolean;
alter table public."inv_item_units" add column if not exists "is_primary" boolean;
alter table public."inv_item_units" add column if not exists "item_id" text;
alter table public."inv_item_units" add column if not exists "unit_id" text;
alter table public."inv_item_units" add column if not exists "unit_level" numeric;
alter table public."inv_item_units" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."inv_items" (id uuid primary key default gen_random_uuid());
alter table public."inv_items" add column if not exists "category" text;
alter table public."inv_items" add column if not exists "company_id" uuid;
alter table public."inv_items" add column if not exists "cost_per_unit" numeric;
alter table public."inv_items" add column if not exists "created_at" timestamptz default now();
alter table public."inv_items" add column if not exists "created_by" uuid;
alter table public."inv_items" add column if not exists "default_location_id" text;
alter table public."inv_items" add column if not exists "description" text;
alter table public."inv_items" add column if not exists "is_active" boolean;
alter table public."inv_items" add column if not exists "is_prep_item" boolean;
alter table public."inv_items" add column if not exists "max_stock_level" numeric;
alter table public."inv_items" add column if not exists "min_stock_level" numeric;
alter table public."inv_items" add column if not exists "name" text;
alter table public."inv_items" add column if not exists "preferred_supplier_id" text;
alter table public."inv_items" add column if not exists "shelf_life_days" numeric;
alter table public."inv_items" add column if not exists "sku" text;
alter table public."inv_items" add column if not exists "unit_id" text;
alter table public."inv_items" add column if not exists "unit_quantity" numeric;
alter table public."inv_items" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_items_company_id_idx" on public."inv_items" ("company_id");

create table if not exists public."inv_locations" (id uuid primary key default gen_random_uuid());
alter table public."inv_locations" add column if not exists "company_id" uuid;
alter table public."inv_locations" add column if not exists "created_at" timestamptz default now();
alter table public."inv_locations" add column if not exists "is_active" boolean;
alter table public."inv_locations" add column if not exists "location_type" text;
alter table public."inv_locations" add column if not exists "name" text;
alter table public."inv_locations" add column if not exists "temperature_controlled" boolean;
alter table public."inv_locations" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_locations_company_id_idx" on public."inv_locations" ("company_id");

create table if not exists public."inv_par_overrides" (id uuid primary key default gen_random_uuid());
alter table public."inv_par_overrides" add column if not exists "created_at" timestamptz default now();
alter table public."inv_par_overrides" add column if not exists "created_by" uuid;
alter table public."inv_par_overrides" add column if not exists "item_id" text;
alter table public."inv_par_overrides" add column if not exists "location_id" text;
alter table public."inv_par_overrides" add column if not exists "max_level" numeric;
alter table public."inv_par_overrides" add column if not exists "min_level" numeric;
alter table public."inv_par_overrides" add column if not exists "override_date" date;
alter table public."inv_par_overrides" add column if not exists "reason" text;

create table if not exists public."inv_par_profiles" (id uuid primary key default gen_random_uuid());
alter table public."inv_par_profiles" add column if not exists "created_at" timestamptz default now();
alter table public."inv_par_profiles" add column if not exists "created_by" uuid;
alter table public."inv_par_profiles" add column if not exists "is_active" boolean;
alter table public."inv_par_profiles" add column if not exists "item_id" text;
alter table public."inv_par_profiles" add column if not exists "location_id" text;
alter table public."inv_par_profiles" add column if not exists "updated_at" timestamptz default now();
alter table public."inv_par_profiles" add column if not exists "weekday_max" numeric;
alter table public."inv_par_profiles" add column if not exists "weekday_min" numeric;
alter table public."inv_par_profiles" add column if not exists "weekend_max" numeric;
alter table public."inv_par_profiles" add column if not exists "weekend_min" numeric;

create table if not exists public."inv_prep_batches" (id uuid primary key default gen_random_uuid());
alter table public."inv_prep_batches" add column if not exists "actual_quantity" numeric;
alter table public."inv_prep_batches" add column if not exists "batch_size" numeric;
alter table public."inv_prep_batches" add column if not exists "batches_made" numeric;
alter table public."inv_prep_batches" add column if not exists "completed_at" timestamptz;
alter table public."inv_prep_batches" add column if not exists "created_at" timestamptz default now();
alter table public."inv_prep_batches" add column if not exists "created_by" uuid;
alter table public."inv_prep_batches" add column if not exists "item_id" text;
alter table public."inv_prep_batches" add column if not exists "notes" text;
alter table public."inv_prep_batches" add column if not exists "planned_quantity" numeric;
alter table public."inv_prep_batches" add column if not exists "prep_date" date;
alter table public."inv_prep_batches" add column if not exists "prep_location_id" text;
alter table public."inv_prep_batches" add column if not exists "prepared_by" text;
alter table public."inv_prep_batches" add column if not exists "started_at" timestamptz;
alter table public."inv_prep_batches" add column if not exists "status" text;

create table if not exists public."inv_prep_plans" (id uuid primary key default gen_random_uuid());
alter table public."inv_prep_plans" add column if not exists "company_id" uuid;
alter table public."inv_prep_plans" add column if not exists "created_at" timestamptz default now();
alter table public."inv_prep_plans" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_prep_plans_company_id_idx" on public."inv_prep_plans" ("company_id");

create table if not exists public."inv_production_approvals" (id uuid primary key default gen_random_uuid());
alter table public."inv_production_approvals" add column if not exists "company_id" uuid;
alter table public."inv_production_approvals" add column if not exists "created_at" timestamptz default now();
alter table public."inv_production_approvals" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_production_approvals_company_id_idx" on public."inv_production_approvals" ("company_id");

create table if not exists public."inv_production_events" (id uuid primary key default gen_random_uuid());
alter table public."inv_production_events" add column if not exists "company_id" uuid;
alter table public."inv_production_events" add column if not exists "created_at" timestamptz default now();
alter table public."inv_production_events" add column if not exists "updated_at" timestamptz default now();
alter table public."inv_production_events" add column if not exists "status" text;
alter table public."inv_production_events" add column if not exists "metadata" jsonb;
create index if not exists "inv_production_events_company_id_idx" on public."inv_production_events" ("company_id");

create table if not exists public."inv_production_materials" (id uuid primary key default gen_random_uuid());
alter table public."inv_production_materials" add column if not exists "company_id" uuid;
alter table public."inv_production_materials" add column if not exists "created_at" timestamptz default now();
alter table public."inv_production_materials" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_production_materials_company_id_idx" on public."inv_production_materials" ("company_id");

create table if not exists public."inv_purchase_lines" (id uuid primary key default gen_random_uuid());
alter table public."inv_purchase_lines" add column if not exists "expiration_date" date;
alter table public."inv_purchase_lines" add column if not exists "item_id" text;
alter table public."inv_purchase_lines" add column if not exists "line_total" numeric;
alter table public."inv_purchase_lines" add column if not exists "lot_number" text;
alter table public."inv_purchase_lines" add column if not exists "notes" text;
alter table public."inv_purchase_lines" add column if not exists "purchase_id" text;
alter table public."inv_purchase_lines" add column if not exists "quantity_ordered" numeric;
alter table public."inv_purchase_lines" add column if not exists "quantity_received" numeric;
alter table public."inv_purchase_lines" add column if not exists "received_date" date;
alter table public."inv_purchase_lines" add column if not exists "unit_cost" numeric;

create table if not exists public."inv_purchases" (id uuid primary key default gen_random_uuid());
alter table public."inv_purchases" add column if not exists "company_id" uuid;
alter table public."inv_purchases" add column if not exists "created_at" timestamptz default now();
alter table public."inv_purchases" add column if not exists "created_by" uuid;
alter table public."inv_purchases" add column if not exists "expected_date" date;
alter table public."inv_purchases" add column if not exists "notes" text;
alter table public."inv_purchases" add column if not exists "order_date" date;
alter table public."inv_purchases" add column if not exists "po_number" text;
alter table public."inv_purchases" add column if not exists "received_by" text;
alter table public."inv_purchases" add column if not exists "received_date" date;
alter table public."inv_purchases" add column if not exists "status" text;
alter table public."inv_purchases" add column if not exists "subtotal" numeric;
alter table public."inv_purchases" add column if not exists "supplier_id" text;
alter table public."inv_purchases" add column if not exists "tax_amount" numeric;
alter table public."inv_purchases" add column if not exists "total_amount" numeric;
alter table public."inv_purchases" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_purchases_company_id_idx" on public."inv_purchases" ("company_id");

create table if not exists public."inv_recipes" (id uuid primary key default gen_random_uuid());
alter table public."inv_recipes" add column if not exists "created_at" timestamptz default now();
alter table public."inv_recipes" add column if not exists "ingredient_id" text;
alter table public."inv_recipes" add column if not exists "item_id" text;
alter table public."inv_recipes" add column if not exists "notes" text;
alter table public."inv_recipes" add column if not exists "quantity_needed" numeric;
alter table public."inv_recipes" add column if not exists "unit_id" text;
alter table public."inv_recipes" add column if not exists "updated_at" timestamptz default now();
alter table public."inv_recipes" add column if not exists "yield_amount" numeric;

create table if not exists public."inv_stock_lots" (id uuid primary key default gen_random_uuid());
alter table public."inv_stock_lots" add column if not exists "created_at" timestamptz default now();
alter table public."inv_stock_lots" add column if not exists "expiration_date" date;
alter table public."inv_stock_lots" add column if not exists "is_active" boolean;
alter table public."inv_stock_lots" add column if not exists "item_id" text;
alter table public."inv_stock_lots" add column if not exists "location_id" text;
alter table public."inv_stock_lots" add column if not exists "lot_number" text;
alter table public."inv_stock_lots" add column if not exists "quantity" numeric;
alter table public."inv_stock_lots" add column if not exists "received_date" date;
alter table public."inv_stock_lots" add column if not exists "supplier_id" text;
alter table public."inv_stock_lots" add column if not exists "unit_cost" numeric;
alter table public."inv_stock_lots" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."inv_suppliers" (id uuid primary key default gen_random_uuid());
alter table public."inv_suppliers" add column if not exists "address" jsonb;
alter table public."inv_suppliers" add column if not exists "company_id" uuid;
alter table public."inv_suppliers" add column if not exists "contact_name" text;
alter table public."inv_suppliers" add column if not exists "created_at" timestamptz default now();
alter table public."inv_suppliers" add column if not exists "created_by" uuid;
alter table public."inv_suppliers" add column if not exists "email" text;
alter table public."inv_suppliers" add column if not exists "is_active" boolean;
alter table public."inv_suppliers" add column if not exists "name" text;
alter table public."inv_suppliers" add column if not exists "payment_terms" text;
alter table public."inv_suppliers" add column if not exists "phone" text;
alter table public."inv_suppliers" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_suppliers_company_id_idx" on public."inv_suppliers" ("company_id");

create table if not exists public."inv_transfer_audit" (id uuid primary key default gen_random_uuid());
alter table public."inv_transfer_audit" add column if not exists "company_id" uuid;
alter table public."inv_transfer_audit" add column if not exists "created_at" timestamptz default now();
alter table public."inv_transfer_audit" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_transfer_audit_company_id_idx" on public."inv_transfer_audit" ("company_id");

create table if not exists public."inv_transfer_items" (id uuid primary key default gen_random_uuid());
alter table public."inv_transfer_items" add column if not exists "company_id" uuid;
alter table public."inv_transfer_items" add column if not exists "created_at" timestamptz default now();
alter table public."inv_transfer_items" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inv_transfer_items_company_id_idx" on public."inv_transfer_items" ("company_id");

create table if not exists public."inv_transfers" (id uuid primary key default gen_random_uuid());
alter table public."inv_transfers" add column if not exists "company_id" uuid;
alter table public."inv_transfers" add column if not exists "created_at" timestamptz default now();
alter table public."inv_transfers" add column if not exists "updated_at" timestamptz default now();
alter table public."inv_transfers" add column if not exists "status" text;
alter table public."inv_transfers" add column if not exists "metadata" jsonb;
create index if not exists "inv_transfers_company_id_idx" on public."inv_transfers" ("company_id");

create table if not exists public."inv_units" (id uuid primary key default gen_random_uuid());
alter table public."inv_units" add column if not exists "abbreviation" text;
alter table public."inv_units" add column if not exists "base_unit_id" text;
alter table public."inv_units" add column if not exists "conversion_factor" numeric;
alter table public."inv_units" add column if not exists "conversion_to_parent" numeric;
alter table public."inv_units" add column if not exists "created_at" timestamptz default now();
alter table public."inv_units" add column if not exists "is_active" boolean;
alter table public."inv_units" add column if not exists "is_base_unit" boolean;
alter table public."inv_units" add column if not exists "name" text;
alter table public."inv_units" add column if not exists "packaging_info" jsonb;
alter table public."inv_units" add column if not exists "parent_unit_id" text;
alter table public."inv_units" add column if not exists "unit_type" text;
alter table public."inv_units" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."inv_waste" (id uuid primary key default gen_random_uuid());
alter table public."inv_waste" add column if not exists "cost_impact" numeric;
alter table public."inv_waste" add column if not exists "created_at" timestamptz default now();
alter table public."inv_waste" add column if not exists "item_id" text;
alter table public."inv_waste" add column if not exists "location_id" text;
alter table public."inv_waste" add column if not exists "lot_id" text;
alter table public."inv_waste" add column if not exists "quantity" numeric;
alter table public."inv_waste" add column if not exists "reason" text;
alter table public."inv_waste" add column if not exists "recorded_by" text;
alter table public."inv_waste" add column if not exists "waste_date" date;
alter table public."inv_waste" add column if not exists "waste_type" text;

create table if not exists public."inventory_categories" (id uuid primary key default gen_random_uuid());
alter table public."inventory_categories" add column if not exists "company_id" uuid;
alter table public."inventory_categories" add column if not exists "created_at" timestamptz default now();
alter table public."inventory_categories" add column if not exists "description" text;
alter table public."inventory_categories" add column if not exists "name" text;
alter table public."inventory_categories" add column if not exists "updated_at" timestamptz default now();
create index if not exists "inventory_categories_company_id_idx" on public."inventory_categories" ("company_id");

create table if not exists public."inventory_items" (id uuid primary key default gen_random_uuid());
alter table public."inventory_items" add column if not exists "category_id" text;
alter table public."inventory_items" add column if not exists "created_at" timestamptz default now();
alter table public."inventory_items" add column if not exists "created_by" uuid;
alter table public."inventory_items" add column if not exists "currency" text;
alter table public."inventory_items" add column if not exists "current_stock" numeric;
alter table public."inventory_items" add column if not exists "description" text;
alter table public."inventory_items" add column if not exists "location" text;
alter table public."inventory_items" add column if not exists "max_stock_level" numeric;
alter table public."inventory_items" add column if not exists "min_stock_level" numeric;
alter table public."inventory_items" add column if not exists "name" text;
alter table public."inventory_items" add column if not exists "sku" text;
alter table public."inventory_items" add column if not exists "status" text;
alter table public."inventory_items" add column if not exists "supplier_contact" text;
alter table public."inventory_items" add column if not exists "supplier_name" text;
alter table public."inventory_items" add column if not exists "unit" text;
alter table public."inventory_items" add column if not exists "unit_price" numeric;
alter table public."inventory_items" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."inventory_transactions" (id uuid primary key default gen_random_uuid());
alter table public."inventory_transactions" add column if not exists "created_at" timestamptz default now();
alter table public."inventory_transactions" add column if not exists "item_id" text;
alter table public."inventory_transactions" add column if not exists "notes" text;
alter table public."inventory_transactions" add column if not exists "performed_by" text;
alter table public."inventory_transactions" add column if not exists "quantity" numeric;
alter table public."inventory_transactions" add column if not exists "reference_number" text;
alter table public."inventory_transactions" add column if not exists "total_amount" numeric;
alter table public."inventory_transactions" add column if not exists "transaction_type" text;
alter table public."inventory_transactions" add column if not exists "unit_price" numeric;

create table if not exists public."investment_plans" (id uuid primary key default gen_random_uuid());
alter table public."investment_plans" add column if not exists "created_at" timestamptz default now();
alter table public."investment_plans" add column if not exists "current_amount" numeric;
alter table public."investment_plans" add column if not exists "description" text;
alter table public."investment_plans" add column if not exists "is_active" boolean;
alter table public."investment_plans" add column if not exists "name" text;
alter table public."investment_plans" add column if not exists "risk_level" text;
alter table public."investment_plans" add column if not exists "strategy" text;
alter table public."investment_plans" add column if not exists "target_amount" numeric;
alter table public."investment_plans" add column if not exists "target_date" date;
alter table public."investment_plans" add column if not exists "updated_at" timestamptz default now();
alter table public."investment_plans" add column if not exists "user_id" uuid;
create index if not exists "investment_plans_user_id_idx" on public."investment_plans" ("user_id");

create table if not exists public."kpi_insights" (id uuid primary key default gen_random_uuid());
alter table public."kpi_insights" add column if not exists "company_id" uuid;
alter table public."kpi_insights" add column if not exists "created_at" timestamptz default now();
alter table public."kpi_insights" add column if not exists "updated_at" timestamptz default now();
alter table public."kpi_insights" add column if not exists "metric" text;
alter table public."kpi_insights" add column if not exists "label" text;
alter table public."kpi_insights" add column if not exists "value" numeric;
alter table public."kpi_insights" add column if not exists "delta" numeric;
alter table public."kpi_insights" add column if not exists "trend" text;
alter table public."kpi_insights" add column if not exists "unit" text;
alter table public."kpi_insights" add column if not exists "metadata" jsonb;
alter table public."kpi_insights" add column if not exists "recorded_at" timestamptz;
create index if not exists "kpi_insights_company_id_idx" on public."kpi_insights" ("company_id");

create table if not exists public."labor_entries" (id uuid primary key default gen_random_uuid());
alter table public."labor_entries" add column if not exists "company_id" uuid;
alter table public."labor_entries" add column if not exists "created_at" timestamptz default now();
alter table public."labor_entries" add column if not exists "updated_at" timestamptz default now();
create index if not exists "labor_entries_company_id_idx" on public."labor_entries" ("company_id");

create table if not exists public."learning_completions" (id uuid primary key default gen_random_uuid());
alter table public."learning_completions" add column if not exists "company_id" uuid;
alter table public."learning_completions" add column if not exists "created_at" timestamptz default now();
alter table public."learning_completions" add column if not exists "updated_at" timestamptz default now();
alter table public."learning_completions" add column if not exists "employee_id" uuid;
alter table public."learning_completions" add column if not exists "metadata" jsonb;
alter table public."learning_completions" add column if not exists "course_id" text;
alter table public."learning_completions" add column if not exists "xp_earned" numeric;
alter table public."learning_completions" add column if not exists "passed" boolean;
alter table public."learning_completions" add column if not exists "certification_awarded" text;
alter table public."learning_completions" add column if not exists "completed_at" timestamptz;
create index if not exists "learning_completions_company_id_idx" on public."learning_completions" ("company_id");
create index if not exists "learning_completions_employee_id_idx" on public."learning_completions" ("employee_id");

create table if not exists public."learning_course_progress" (id uuid primary key default gen_random_uuid());
alter table public."learning_course_progress" add column if not exists "completed_at" timestamptz;
alter table public."learning_course_progress" add column if not exists "course_code" text;
alter table public."learning_course_progress" add column if not exists "created_at" timestamptz default now();
alter table public."learning_course_progress" add column if not exists "employee_id" uuid;
alter table public."learning_course_progress" add column if not exists "last_interaction_at" timestamptz;
alter table public."learning_course_progress" add column if not exists "progress_percent" numeric;
alter table public."learning_course_progress" add column if not exists "started_at" timestamptz;
alter table public."learning_course_progress" add column if not exists "status" text;
alter table public."learning_course_progress" add column if not exists "updated_at" timestamptz default now();
create index if not exists "learning_course_progress_employee_id_idx" on public."learning_course_progress" ("employee_id");

create table if not exists public."learning_courses" (id uuid primary key default gen_random_uuid());
alter table public."learning_courses" add column if not exists "base_xp" numeric;
alter table public."learning_courses" add column if not exists "category" text;
alter table public."learning_courses" add column if not exists "created_at" timestamptz default now();
alter table public."learning_courses" add column if not exists "delivery_mode" text;
alter table public."learning_courses" add column if not exists "description" text;
alter table public."learning_courses" add column if not exists "title" text;
alter table public."learning_courses" add column if not exists "auto_schedule_eligible" boolean;
alter table public."learning_courses" add column if not exists "certification_code" text;
alter table public."learning_courses" add column if not exists "certification_id" text;
alter table public."learning_courses" add column if not exists "company_id" uuid;
alter table public."learning_courses" add column if not exists "created_by" uuid;
alter table public."learning_courses" add column if not exists "estimated_hours" numeric;
alter table public."learning_courses" add column if not exists "featured" boolean;
alter table public."learning_courses" add column if not exists "level_requirement" numeric;
alter table public."learning_courses" add column if not exists "role_unlock" jsonb;
alter table public."learning_courses" add column if not exists "slug" text;
alter table public."learning_courses" add column if not exists "target_roles" jsonb;
alter table public."learning_courses" add column if not exists "updated_at" timestamptz default now();
alter table public."learning_courses" add column if not exists "xp_reward" numeric;
create index if not exists "learning_courses_company_id_idx" on public."learning_courses" ("company_id");

create table if not exists public."learning_enrollments" (id uuid primary key default gen_random_uuid());
alter table public."learning_enrollments" add column if not exists "company_id" uuid;
alter table public."learning_enrollments" add column if not exists "created_at" timestamptz default now();
alter table public."learning_enrollments" add column if not exists "updated_at" timestamptz default now();
alter table public."learning_enrollments" add column if not exists "employee_id" uuid;
alter table public."learning_enrollments" add column if not exists "metadata" jsonb;
create index if not exists "learning_enrollments_company_id_idx" on public."learning_enrollments" ("company_id");
create index if not exists "learning_enrollments_employee_id_idx" on public."learning_enrollments" ("employee_id");

create table if not exists public."learning_progress" (id uuid primary key default gen_random_uuid());
alter table public."learning_progress" add column if not exists "course_id" text;
alter table public."learning_progress" add column if not exists "progress" numeric;
alter table public."learning_progress" add column if not exists "user_id" uuid;
create index if not exists "learning_progress_user_id_idx" on public."learning_progress" ("user_id");

create table if not exists public."learning_progress_events" (id uuid primary key default gen_random_uuid());
alter table public."learning_progress_events" add column if not exists "company_id" uuid;
alter table public."learning_progress_events" add column if not exists "created_at" timestamptz default now();
alter table public."learning_progress_events" add column if not exists "updated_at" timestamptz default now();
alter table public."learning_progress_events" add column if not exists "employee_id" uuid;
alter table public."learning_progress_events" add column if not exists "metadata" jsonb;
create index if not exists "learning_progress_events_company_id_idx" on public."learning_progress_events" ("company_id");
create index if not exists "learning_progress_events_employee_id_idx" on public."learning_progress_events" ("employee_id");

create table if not exists public."message_channels" (id uuid primary key default gen_random_uuid());
alter table public."message_channels" add column if not exists "created_at" timestamptz default now();
alter table public."message_channels" add column if not exists "created_by" uuid;
alter table public."message_channels" add column if not exists "department_id" text;
alter table public."message_channels" add column if not exists "description" text;
alter table public."message_channels" add column if not exists "is_private" boolean;
alter table public."message_channels" add column if not exists "name" text;
alter table public."message_channels" add column if not exists "type" text;
alter table public."message_channels" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."message_reactions" (id uuid primary key default gen_random_uuid());
alter table public."message_reactions" add column if not exists "created_at" timestamptz default now();
alter table public."message_reactions" add column if not exists "emoji" text;
alter table public."message_reactions" add column if not exists "message_id" text;
alter table public."message_reactions" add column if not exists "user_id" uuid;
create index if not exists "message_reactions_user_id_idx" on public."message_reactions" ("user_id");

create table if not exists public."messages" (id uuid primary key default gen_random_uuid());
alter table public."messages" add column if not exists "attachments" jsonb;
alter table public."messages" add column if not exists "channel_id" text;
alter table public."messages" add column if not exists "content" text;
alter table public."messages" add column if not exists "created_at" timestamptz default now();
alter table public."messages" add column if not exists "edited_at" timestamptz;
alter table public."messages" add column if not exists "message_type" text;
alter table public."messages" add column if not exists "reply_to_id" text;
alter table public."messages" add column if not exists "sender_id" uuid;
alter table public."messages" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."ooda_cycles" (id uuid primary key default gen_random_uuid());
alter table public."ooda_cycles" add column if not exists "created_at" timestamptz default now();
alter table public."ooda_cycles" add column if not exists "emotional_tone" text;
alter table public."ooda_cycles" add column if not exists "focus_area" text;
alter table public."ooda_cycles" add column if not exists "generated_goals" numeric;
alter table public."ooda_cycles" add column if not exists "generated_tasks" numeric;
alter table public."ooda_cycles" add column if not exists "phase" text;
alter table public."ooda_cycles" add column if not exists "phase_status" text;
alter table public."ooda_cycles" add column if not exists "updated_at" timestamptz default now();
alter table public."ooda_cycles" add column if not exists "user_id" uuid;
create index if not exists "ooda_cycles_user_id_idx" on public."ooda_cycles" ("user_id");

create table if not exists public."ooda_responses" (id uuid primary key default gen_random_uuid());
alter table public."ooda_responses" add column if not exists "created_at" timestamptz default now();
alter table public."ooda_responses" add column if not exists "cycle_id" text;
alter table public."ooda_responses" add column if not exists "responses" jsonb;
alter table public."ooda_responses" add column if not exists "summary" text;
alter table public."ooda_responses" add column if not exists "updated_at" timestamptz default now();
alter table public."ooda_responses" add column if not exists "user_id" uuid;
create index if not exists "ooda_responses_user_id_idx" on public."ooda_responses" ("user_id");

create table if not exists public."operations_checklists" (id uuid primary key default gen_random_uuid());
alter table public."operations_checklists" add column if not exists "company_id" uuid;
alter table public."operations_checklists" add column if not exists "created_at" timestamptz default now();
alter table public."operations_checklists" add column if not exists "updated_at" timestamptz default now();
create index if not exists "operations_checklists_company_id_idx" on public."operations_checklists" ("company_id");

create table if not exists public."operations_tasks" (id uuid primary key default gen_random_uuid());
alter table public."operations_tasks" add column if not exists "company_id" uuid;
alter table public."operations_tasks" add column if not exists "created_at" timestamptz default now();
alter table public."operations_tasks" add column if not exists "updated_at" timestamptz default now();
create index if not exists "operations_tasks_company_id_idx" on public."operations_tasks" ("company_id");

create table if not exists public."ops_automation_suggestions" (id uuid primary key default gen_random_uuid());
alter table public."ops_automation_suggestions" add column if not exists "company_id" uuid;
alter table public."ops_automation_suggestions" add column if not exists "created_at" timestamptz default now();
alter table public."ops_automation_suggestions" add column if not exists "updated_at" timestamptz default now();
alter table public."ops_automation_suggestions" add column if not exists "org_id" text;
alter table public."ops_automation_suggestions" add column if not exists "issue_id" text;
alter table public."ops_automation_suggestions" add column if not exists "suggestion_title" text;
alter table public."ops_automation_suggestions" add column if not exists "suggestion_summary" text;
alter table public."ops_automation_suggestions" add column if not exists "script" jsonb;
alter table public."ops_automation_suggestions" add column if not exists "status" text;
create index if not exists "ops_automation_suggestions_company_id_idx" on public."ops_automation_suggestions" ("company_id");

create table if not exists public."ops_issues" (id uuid primary key default gen_random_uuid());
alter table public."ops_issues" add column if not exists "company_id" uuid;
alter table public."ops_issues" add column if not exists "created_at" timestamptz default now();
alter table public."ops_issues" add column if not exists "updated_at" timestamptz default now();
alter table public."ops_issues" add column if not exists "org_id" text;
alter table public."ops_issues" add column if not exists "kpi_key" text;
alter table public."ops_issues" add column if not exists "issue_type" text;
alter table public."ops_issues" add column if not exists "title" text;
alter table public."ops_issues" add column if not exists "description" text;
alter table public."ops_issues" add column if not exists "severity" text;
alter table public."ops_issues" add column if not exists "source" jsonb;
alter table public."ops_issues" add column if not exists "status" text;
create index if not exists "ops_issues_company_id_idx" on public."ops_issues" ("company_id");

create table if not exists public."ops_kpi_snapshots" (id uuid primary key default gen_random_uuid());
alter table public."ops_kpi_snapshots" add column if not exists "company_id" uuid;
alter table public."ops_kpi_snapshots" add column if not exists "created_at" timestamptz default now();
alter table public."ops_kpi_snapshots" add column if not exists "updated_at" timestamptz default now();
alter table public."ops_kpi_snapshots" add column if not exists "org_id" text;
alter table public."ops_kpi_snapshots" add column if not exists "kpi_key" text;
alter table public."ops_kpi_snapshots" add column if not exists "value" numeric;
alter table public."ops_kpi_snapshots" add column if not exists "snapshot_at" timestamptz;
alter table public."ops_kpi_snapshots" add column if not exists "metadata" jsonb;
create index if not exists "ops_kpi_snapshots_company_id_idx" on public."ops_kpi_snapshots" ("company_id");

create table if not exists public."org_prefs" (id uuid primary key default gen_random_uuid());
alter table public."org_prefs" add column if not exists "auto_lock_day_of_week" numeric;
alter table public."org_prefs" add column if not exists "auto_lock_hour" numeric;
alter table public."org_prefs" add column if not exists "availability_lock_mode" text;
alter table public."org_prefs" add column if not exists "created_at" timestamptz default now();
alter table public."org_prefs" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."payment_approvals" (id uuid primary key default gen_random_uuid());
alter table public."payment_approvals" add column if not exists "approver_id" text;
alter table public."payment_approvals" add column if not exists "comments" text;
alter table public."payment_approvals" add column if not exists "created_at" timestamptz default now();
alter table public."payment_approvals" add column if not exists "payment_id" text;
alter table public."payment_approvals" add column if not exists "status" text;
alter table public."payment_approvals" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."payments" (id uuid primary key default gen_random_uuid());
alter table public."payments" add column if not exists "amount" numeric;
alter table public."payments" add column if not exists "approved_at" timestamptz;
alter table public."payments" add column if not exists "approved_by" uuid;
alter table public."payments" add column if not exists "attachments" jsonb;
alter table public."payments" add column if not exists "created_at" timestamptz default now();
alter table public."payments" add column if not exists "created_by" uuid;
alter table public."payments" add column if not exists "currency" text;
alter table public."payments" add column if not exists "description" text;
alter table public."payments" add column if not exists "due_date" date;
alter table public."payments" add column if not exists "notes" text;
alter table public."payments" add column if not exists "paid_date" date;
alter table public."payments" add column if not exists "payment_method" text;
alter table public."payments" add column if not exists "payment_type" text;
alter table public."payments" add column if not exists "recipient_id" uuid;
alter table public."payments" add column if not exists "recipient_name" text;
alter table public."payments" add column if not exists "recipient_type" text;
alter table public."payments" add column if not exists "reference_number" text;
alter table public."payments" add column if not exists "status" text;
alter table public."payments" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."performance_goal_reviews" (id uuid primary key default gen_random_uuid());
alter table public."performance_goal_reviews" add column if not exists "company_id" uuid;
alter table public."performance_goal_reviews" add column if not exists "created_at" timestamptz default now();
alter table public."performance_goal_reviews" add column if not exists "updated_at" timestamptz default now();
create index if not exists "performance_goal_reviews_company_id_idx" on public."performance_goal_reviews" ("company_id");

create table if not exists public."performance_reviews" (id uuid primary key default gen_random_uuid());
alter table public."performance_reviews" add column if not exists "company_id" uuid;
alter table public."performance_reviews" add column if not exists "created_at" timestamptz default now();
alter table public."performance_reviews" add column if not exists "updated_at" timestamptz default now();
create index if not exists "performance_reviews_company_id_idx" on public."performance_reviews" ("company_id");

create table if not exists public."permission_audit_logs" (id uuid primary key default gen_random_uuid());
alter table public."permission_audit_logs" add column if not exists "company_id" uuid;
alter table public."permission_audit_logs" add column if not exists "created_at" timestamptz default now();
alter table public."permission_audit_logs" add column if not exists "updated_at" timestamptz default now();
create index if not exists "permission_audit_logs_company_id_idx" on public."permission_audit_logs" ("company_id");

create table if not exists public."position_assignments" (id uuid primary key default gen_random_uuid());
alter table public."position_assignments" add column if not exists "assigned_at" timestamptz;
alter table public."position_assignments" add column if not exists "assigned_by" uuid;
alter table public."position_assignments" add column if not exists "company_id" uuid;
alter table public."position_assignments" add column if not exists "is_active" boolean;
alter table public."position_assignments" add column if not exists "position_id" text;
alter table public."position_assignments" add column if not exists "user_id" uuid;
create index if not exists "position_assignments_company_id_idx" on public."position_assignments" ("company_id");
create index if not exists "position_assignments_user_id_idx" on public."position_assignments" ("user_id");

create table if not exists public."positions" (id uuid primary key default gen_random_uuid());
alter table public."positions" add column if not exists "color" text;
alter table public."positions" add column if not exists "company_id" uuid;
alter table public."positions" add column if not exists "created_at" timestamptz default now();
alter table public."positions" add column if not exists "created_by" uuid;
alter table public."positions" add column if not exists "department_id" text;
alter table public."positions" add column if not exists "description" text;
alter table public."positions" add column if not exists "is_active" boolean;
alter table public."positions" add column if not exists "name" text;
alter table public."positions" add column if not exists "permissions" jsonb;
alter table public."positions" add column if not exists "role" text;
alter table public."positions" add column if not exists "role_id" text;
alter table public."positions" add column if not exists "updated_at" timestamptz default now();
create index if not exists "positions_company_id_idx" on public."positions" ("company_id");

create table if not exists public."profiles" (id uuid primary key default gen_random_uuid());
alter table public."profiles" add column if not exists "address" jsonb;
alter table public."profiles" add column if not exists "avatar_url" text;
alter table public."profiles" add column if not exists "birth_date" date;
alter table public."profiles" add column if not exists "company_id" uuid;
alter table public."profiles" add column if not exists "created_at" timestamptz default now();
alter table public."profiles" add column if not exists "department_id" text;
alter table public."profiles" add column if not exists "email" text;
alter table public."profiles" add column if not exists "emergency_contact" jsonb;
alter table public."profiles" add column if not exists "employee_id" uuid;
alter table public."profiles" add column if not exists "employment_status" text;
alter table public."profiles" add column if not exists "first_name" text;
alter table public."profiles" add column if not exists "hire_date" date;
alter table public."profiles" add column if not exists "invitation_token" text;
alter table public."profiles" add column if not exists "is_company_admin" boolean;
alter table public."profiles" add column if not exists "last_name" text;
alter table public."profiles" add column if not exists "phone" text;
alter table public."profiles" add column if not exists "position_id" text;
alter table public."profiles" add column if not exists "role" text;
alter table public."profiles" add column if not exists "role_id" text;
alter table public."profiles" add column if not exists "updated_at" timestamptz default now();
create index if not exists "profiles_company_id_idx" on public."profiles" ("company_id");
create index if not exists "profiles_employee_id_idx" on public."profiles" ("employee_id");

create table if not exists public."purchase_order_items" (id uuid primary key default gen_random_uuid());
alter table public."purchase_order_items" add column if not exists "created_at" timestamptz default now();
alter table public."purchase_order_items" add column if not exists "item_id" text;
alter table public."purchase_order_items" add column if not exists "item_name" text;
alter table public."purchase_order_items" add column if not exists "po_id" text;
alter table public."purchase_order_items" add column if not exists "quantity" numeric;
alter table public."purchase_order_items" add column if not exists "received_quantity" numeric;
alter table public."purchase_order_items" add column if not exists "total_price" numeric;
alter table public."purchase_order_items" add column if not exists "unit_price" numeric;

create table if not exists public."purchase_orders" (id uuid primary key default gen_random_uuid());
alter table public."purchase_orders" add column if not exists "actual_delivery_date" date;
alter table public."purchase_orders" add column if not exists "approved_by" uuid;
alter table public."purchase_orders" add column if not exists "created_at" timestamptz default now();
alter table public."purchase_orders" add column if not exists "created_by" uuid;
alter table public."purchase_orders" add column if not exists "currency" text;
alter table public."purchase_orders" add column if not exists "expected_delivery_date" date;
alter table public."purchase_orders" add column if not exists "notes" text;
alter table public."purchase_orders" add column if not exists "order_date" date;
alter table public."purchase_orders" add column if not exists "po_number" text;
alter table public."purchase_orders" add column if not exists "status" text;
alter table public."purchase_orders" add column if not exists "supplier_contact" jsonb;
alter table public."purchase_orders" add column if not exists "supplier_name" text;
alter table public."purchase_orders" add column if not exists "total_amount" numeric;
alter table public."purchase_orders" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."recognition_award_rules" (id uuid primary key default gen_random_uuid());
alter table public."recognition_award_rules" add column if not exists "company_id" uuid;
alter table public."recognition_award_rules" add column if not exists "created_at" timestamptz default now();
alter table public."recognition_award_rules" add column if not exists "updated_at" timestamptz default now();
alter table public."recognition_award_rules" add column if not exists "trigger_type" text;
alter table public."recognition_award_rules" add column if not exists "reward_type" text;
alter table public."recognition_award_rules" add column if not exists "reward_value" numeric;
alter table public."recognition_award_rules" add column if not exists "conditions" jsonb;
alter table public."recognition_award_rules" add column if not exists "is_active" boolean;
create index if not exists "recognition_award_rules_company_id_idx" on public."recognition_award_rules" ("company_id");

create table if not exists public."recognition_events" (id uuid primary key default gen_random_uuid());
alter table public."recognition_events" add column if not exists "awarded_at" timestamptz;
alter table public."recognition_events" add column if not exists "company_id" uuid;
alter table public."recognition_events" add column if not exists "created_at" timestamptz default now();
alter table public."recognition_events" add column if not exists "message" text;
alter table public."recognition_events" add column if not exists "type" text;
alter table public."recognition_events" add column if not exists "user_id" uuid;
create index if not exists "recognition_events_company_id_idx" on public."recognition_events" ("company_id");
create index if not exists "recognition_events_user_id_idx" on public."recognition_events" ("user_id");

create table if not exists public."reminders" (id uuid primary key default gen_random_uuid());
alter table public."reminders" add column if not exists "auto_complete" boolean;
alter table public."reminders" add column if not exists "completed" boolean;
alter table public."reminders" add column if not exists "completed_at" timestamptz;
alter table public."reminders" add column if not exists "created_at" timestamptz default now();
alter table public."reminders" add column if not exists "description" text;
alter table public."reminders" add column if not exists "last_triggered_at" timestamptz;
alter table public."reminders" add column if not exists "next_reminder_at" timestamptz;
alter table public."reminders" add column if not exists "notification_methods" jsonb;
alter table public."reminders" add column if not exists "priority" text;
alter table public."reminders" add column if not exists "remind_at" timestamptz;
alter table public."reminders" add column if not exists "repeat_enabled" boolean;
alter table public."reminders" add column if not exists "repeat_interval" text;
alter table public."reminders" add column if not exists "snooze_count" numeric;
alter table public."reminders" add column if not exists "snooze_enabled" boolean;
alter table public."reminders" add column if not exists "sound_enabled" boolean;
alter table public."reminders" add column if not exists "sound_type" text;
alter table public."reminders" add column if not exists "task_id" text;
alter table public."reminders" add column if not exists "title" text;
alter table public."reminders" add column if not exists "type" text;
alter table public."reminders" add column if not exists "updated_at" timestamptz default now();
alter table public."reminders" add column if not exists "user_id" uuid;
create index if not exists "reminders_user_id_idx" on public."reminders" ("user_id");

create table if not exists public."report_events" (id uuid primary key default gen_random_uuid());
alter table public."report_events" add column if not exists "created_at" timestamptz default now();
alter table public."report_events" add column if not exists "description" text;
alter table public."report_events" add column if not exists "event_type" text;
alter table public."report_events" add column if not exists "metadata" jsonb;
alter table public."report_events" add column if not exists "occurred_at" timestamptz;
alter table public."report_events" add column if not exists "severity" text;
alter table public."report_events" add column if not exists "user_id" uuid;
create index if not exists "report_events_user_id_idx" on public."report_events" ("user_id");

create table if not exists public."report_schedules" (id uuid primary key default gen_random_uuid());
alter table public."report_schedules" add column if not exists "created_at" timestamptz default now();
alter table public."report_schedules" add column if not exists "is_active" boolean;
alter table public."report_schedules" add column if not exists "last_sent_at" timestamptz;
alter table public."report_schedules" add column if not exists "recipients" jsonb;
alter table public."report_schedules" add column if not exists "report_id" text;
alter table public."report_schedules" add column if not exists "schedule_type" text;
alter table public."report_schedules" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."role_permissions" (id uuid primary key default gen_random_uuid());
alter table public."role_permissions" add column if not exists "created_at" timestamptz default now();
alter table public."role_permissions" add column if not exists "permission_key" text;
alter table public."role_permissions" add column if not exists "permission_value" boolean;
alter table public."role_permissions" add column if not exists "role_id" text;

create table if not exists public."sales_ledger" (id uuid primary key default gen_random_uuid());
alter table public."sales_ledger" add column if not exists "company_id" uuid;
alter table public."sales_ledger" add column if not exists "created_at" timestamptz default now();
alter table public."sales_ledger" add column if not exists "updated_at" timestamptz default now();
create index if not exists "sales_ledger_company_id_idx" on public."sales_ledger" ("company_id");

create table if not exists public."schedule_assignments" (id uuid primary key default gen_random_uuid());
alter table public."schedule_assignments" add column if not exists "assigned_at" timestamptz;
alter table public."schedule_assignments" add column if not exists "assigned_by" uuid;
alter table public."schedule_assignments" add column if not exists "confirmed_at" timestamptz;
alter table public."schedule_assignments" add column if not exists "created_at" timestamptz default now();
alter table public."schedule_assignments" add column if not exists "schedule_id" text;
alter table public."schedule_assignments" add column if not exists "status" text;
alter table public."schedule_assignments" add column if not exists "updated_at" timestamptz default now();
alter table public."schedule_assignments" add column if not exists "user_id" uuid;
create index if not exists "schedule_assignments_user_id_idx" on public."schedule_assignments" ("user_id");

create table if not exists public."schedule_rulebooks" (id uuid primary key default gen_random_uuid());
alter table public."schedule_rulebooks" add column if not exists "company_id" uuid;
alter table public."schedule_rulebooks" add column if not exists "created_at" timestamptz default now();
alter table public."schedule_rulebooks" add column if not exists "updated_at" timestamptz default now();
create index if not exists "schedule_rulebooks_company_id_idx" on public."schedule_rulebooks" ("company_id");

create table if not exists public."schedule_shifts" (id uuid primary key default gen_random_uuid());
alter table public."schedule_shifts" add column if not exists "company_id" uuid;
alter table public."schedule_shifts" add column if not exists "created_at" timestamptz default now();
alter table public."schedule_shifts" add column if not exists "updated_at" timestamptz default now();
create index if not exists "schedule_shifts_company_id_idx" on public."schedule_shifts" ("company_id");

create table if not exists public."schedule_workflow_criteria" (id uuid primary key default gen_random_uuid());
alter table public."schedule_workflow_criteria" add column if not exists "company_id" uuid;
alter table public."schedule_workflow_criteria" add column if not exists "created_at" timestamptz default now();
alter table public."schedule_workflow_criteria" add column if not exists "updated_at" timestamptz default now();
create index if not exists "schedule_workflow_criteria_company_id_idx" on public."schedule_workflow_criteria" ("company_id");

create table if not exists public."schedule_workflow_steps" (id uuid primary key default gen_random_uuid());
alter table public."schedule_workflow_steps" add column if not exists "company_id" uuid;
alter table public."schedule_workflow_steps" add column if not exists "created_at" timestamptz default now();
alter table public."schedule_workflow_steps" add column if not exists "updated_at" timestamptz default now();
create index if not exists "schedule_workflow_steps_company_id_idx" on public."schedule_workflow_steps" ("company_id");

create table if not exists public."schedules" (id uuid primary key default gen_random_uuid());
alter table public."schedules" add column if not exists "break_minutes" numeric;
alter table public."schedules" add column if not exists "color" text;
alter table public."schedules" add column if not exists "company_id" uuid;
alter table public."schedules" add column if not exists "created_at" timestamptz default now();
alter table public."schedules" add column if not exists "created_by" uuid;
alter table public."schedules" add column if not exists "end_time" timestamptz;
alter table public."schedules" add column if not exists "hourly_rate" numeric;
alter table public."schedules" add column if not exists "is_all_day" boolean;
alter table public."schedules" add column if not exists "is_published" boolean;
alter table public."schedules" add column if not exists "is_template" boolean;
alter table public."schedules" add column if not exists "location" text;
alter table public."schedules" add column if not exists "notes" text;
alter table public."schedules" add column if not exists "position_id" text;
alter table public."schedules" add column if not exists "required_headcount" numeric;
alter table public."schedules" add column if not exists "requirements" jsonb;
alter table public."schedules" add column if not exists "role" text;
alter table public."schedules" add column if not exists "start_time" timestamptz;
alter table public."schedules" add column if not exists "status" text;
alter table public."schedules" add column if not exists "template_id" text;
alter table public."schedules" add column if not exists "timezone" text;
alter table public."schedules" add column if not exists "title" text;
alter table public."schedules" add column if not exists "updated_at" timestamptz default now();
alter table public."schedules" add column if not exists "user_id" uuid;
create index if not exists "schedules_company_id_idx" on public."schedules" ("company_id");
create index if not exists "schedules_user_id_idx" on public."schedules" ("user_id");

create table if not exists public."section_templates" (id uuid primary key default gen_random_uuid());
alter table public."section_templates" add column if not exists "category" text;
alter table public."section_templates" add column if not exists "config" jsonb;
alter table public."section_templates" add column if not exists "created_at" timestamptz default now();
alter table public."section_templates" add column if not exists "created_by" uuid;
alter table public."section_templates" add column if not exists "default_pages" jsonb;
alter table public."section_templates" add column if not exists "default_permissions" jsonb;
alter table public."section_templates" add column if not exists "description" text;
alter table public."section_templates" add column if not exists "icon" text;
alter table public."section_templates" add column if not exists "is_public" boolean;
alter table public."section_templates" add column if not exists "name" text;
alter table public."section_templates" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."shift_assignments" (id uuid primary key default gen_random_uuid());
alter table public."shift_assignments" add column if not exists "assigned_at" timestamptz;
alter table public."shift_assignments" add column if not exists "assigned_by" uuid;
alter table public."shift_assignments" add column if not exists "schedule_id" text;
alter table public."shift_assignments" add column if not exists "status" text;
alter table public."shift_assignments" add column if not exists "user_id" uuid;
create index if not exists "shift_assignments_user_id_idx" on public."shift_assignments" ("user_id");

create table if not exists public."shift_swaps" (id uuid primary key default gen_random_uuid());
alter table public."shift_swaps" add column if not exists "approved_at" timestamptz;
alter table public."shift_swaps" add column if not exists "approved_by" uuid;
alter table public."shift_swaps" add column if not exists "created_at" timestamptz default now();
alter table public."shift_swaps" add column if not exists "reason" text;
alter table public."shift_swaps" add column if not exists "requesting_user_id" text;
alter table public."shift_swaps" add column if not exists "schedule_id" text;
alter table public."shift_swaps" add column if not exists "status" text;
alter table public."shift_swaps" add column if not exists "swap_type" text;
alter table public."shift_swaps" add column if not exists "target_user_id" text;
alter table public."shift_swaps" add column if not exists "updated_at" timestamptz default now();

create table if not exists public."shift_templates" (id uuid primary key default gen_random_uuid());
alter table public."shift_templates" add column if not exists "color" text;
alter table public."shift_templates" add column if not exists "company_id" uuid;
alter table public."shift_templates" add column if not exists "created_at" timestamptz default now();
alter table public."shift_templates" add column if not exists "created_by" uuid;
alter table public."shift_templates" add column if not exists "default_notes" text;
alter table public."shift_templates" add column if not exists "description" text;
alter table public."shift_templates" add column if not exists "duration_hours" numeric;
alter table public."shift_templates" add column if not exists "is_all_day" boolean;
alter table public."shift_templates" add column if not exists "job_position_id" text;
alter table public."shift_templates" add column if not exists "name" text;
alter table public."shift_templates" add column if not exists "required_headcount" numeric;
alter table public."shift_templates" add column if not exists "tasks" jsonb;
alter table public."shift_templates" add column if not exists "updated_at" timestamptz default now();
create index if not exists "shift_templates_company_id_idx" on public."shift_templates" ("company_id");

create table if not exists public."skill_matrix" (id uuid primary key default gen_random_uuid());
alter table public."skill_matrix" add column if not exists "created_at" timestamptz default now();
alter table public."skill_matrix" add column if not exists "employee_id" uuid;
alter table public."skill_matrix" add column if not exists "last_review" text;
alter table public."skill_matrix" add column if not exists "level" numeric;
alter table public."skill_matrix" add column if not exists "role" text;
alter table public."skill_matrix" add column if not exists "updated_at" timestamptz default now();
alter table public."skill_matrix" add column if not exists "xp" numeric;
create index if not exists "skill_matrix_employee_id_idx" on public."skill_matrix" ("employee_id");

create table if not exists public."staff_availability" (id uuid primary key default gen_random_uuid());
alter table public."staff_availability" add column if not exists "created_at" timestamptz default now();
alter table public."staff_availability" add column if not exists "day_of_week" numeric;
alter table public."staff_availability" add column if not exists "end_time" timestamptz;
alter table public."staff_availability" add column if not exists "is_preferred" boolean;
alter table public."staff_availability" add column if not exists "start_time" timestamptz;
alter table public."staff_availability" add column if not exists "updated_at" timestamptz default now();
alter table public."staff_availability" add column if not exists "user_id" uuid;
alter table public."staff_availability" add column if not exists "week_start_date" date;
create index if not exists "staff_availability_user_id_idx" on public."staff_availability" ("user_id");

create table if not exists public."staff_performance" (id uuid primary key default gen_random_uuid());
alter table public."staff_performance" add column if not exists "attendance_status" text;
alter table public."staff_performance" add column if not exists "break_compliance" boolean;
alter table public."staff_performance" add column if not exists "created_at" timestamptz default now();
alter table public."staff_performance" add column if not exists "date" date;
alter table public."staff_performance" add column if not exists "hours_worked" numeric;
alter table public."staff_performance" add column if not exists "notes" text;
alter table public."staff_performance" add column if not exists "overtime_hours" numeric;
alter table public."staff_performance" add column if not exists "performance_score" numeric;
alter table public."staff_performance" add column if not exists "role" text;
alter table public."staff_performance" add column if not exists "user_id" uuid;
create index if not exists "staff_performance_user_id_idx" on public."staff_performance" ("user_id");

create table if not exists public."supabase_migrations" ();
alter table public."supabase_migrations" add column if not exists "applied_at" timestamptz;
alter table public."supabase_migrations" add column if not exists "name" text;
alter table public."supabase_migrations" add column if not exists "statements" jsonb;
alter table public."supabase_migrations" add column if not exists "version" text;

create table if not exists public."supervisor_schedule" (id uuid primary key default gen_random_uuid());
alter table public."supervisor_schedule" add column if not exists "company_id" uuid;
alter table public."supervisor_schedule" add column if not exists "created_at" timestamptz default now();
alter table public."supervisor_schedule" add column if not exists "location" text;
alter table public."supervisor_schedule" add column if not exists "notes" text;
alter table public."supervisor_schedule" add column if not exists "role" text;
alter table public."supervisor_schedule" add column if not exists "schedule_date" date;
alter table public."supervisor_schedule" add column if not exists "updated_at" timestamptz default now();
alter table public."supervisor_schedule" add column if not exists "user_id" uuid;
create index if not exists "supervisor_schedule_company_id_idx" on public."supervisor_schedule" ("company_id");
create index if not exists "supervisor_schedule_user_id_idx" on public."supervisor_schedule" ("user_id");

create table if not exists public."system_logs" (id uuid primary key default gen_random_uuid());
alter table public."system_logs" add column if not exists "company_id" uuid;
alter table public."system_logs" add column if not exists "created_at" timestamptz default now();
alter table public."system_logs" add column if not exists "updated_at" timestamptz default now();
create index if not exists "system_logs_company_id_idx" on public."system_logs" ("company_id");

create table if not exists public."task_activities" (id uuid primary key default gen_random_uuid());
alter table public."task_activities" add column if not exists "action_type" text;
alter table public."task_activities" add column if not exists "created_at" timestamptz default now();
alter table public."task_activities" add column if not exists "description" text;
alter table public."task_activities" add column if not exists "metadata" jsonb;
alter table public."task_activities" add column if not exists "task_id" text;
alter table public."task_activities" add column if not exists "user_id" uuid;
create index if not exists "task_activities_user_id_idx" on public."task_activities" ("user_id");

create table if not exists public."task_comments" (id uuid primary key default gen_random_uuid());
alter table public."task_comments" add column if not exists "comment" text;
alter table public."task_comments" add column if not exists "created_at" timestamptz default now();
alter table public."task_comments" add column if not exists "task_id" text;
alter table public."task_comments" add column if not exists "updated_at" timestamptz default now();
alter table public."task_comments" add column if not exists "user_id" uuid;
create index if not exists "task_comments_user_id_idx" on public."task_comments" ("user_id");

create table if not exists public."task_notifications" (id uuid primary key default gen_random_uuid());
alter table public."task_notifications" add column if not exists "created_at" timestamptz default now();
alter table public."task_notifications" add column if not exists "message" text;
alter table public."task_notifications" add column if not exists "metadata" jsonb;
alter table public."task_notifications" add column if not exists "read_at" timestamptz;
alter table public."task_notifications" add column if not exists "task_id" text;
alter table public."task_notifications" add column if not exists "title" text;
alter table public."task_notifications" add column if not exists "type" text;
alter table public."task_notifications" add column if not exists "user_id" uuid;
create index if not exists "task_notifications_user_id_idx" on public."task_notifications" ("user_id");

create table if not exists public."task_workflow_instances" (id uuid primary key default gen_random_uuid());
alter table public."task_workflow_instances" add column if not exists "completed_at" timestamptz;
alter table public."task_workflow_instances" add column if not exists "created_at" timestamptz default now();
alter table public."task_workflow_instances" add column if not exists "current_step_id" text;
alter table public."task_workflow_instances" add column if not exists "started_at" timestamptz;
alter table public."task_workflow_instances" add column if not exists "status" text;
alter table public."task_workflow_instances" add column if not exists "task_id" text;
alter table public."task_workflow_instances" add column if not exists "updated_at" timestamptz default now();
alter table public."task_workflow_instances" add column if not exists "workflow_id" text;

create table if not exists public."tasks" (id uuid primary key default gen_random_uuid());
alter table public."tasks" add column if not exists "actual_hours" numeric;
alter table public."tasks" add column if not exists "assigned_to" uuid;
alter table public."tasks" add column if not exists "attachments" jsonb;
alter table public."tasks" add column if not exists "company_id" uuid;
alter table public."tasks" add column if not exists "completed_at" timestamptz;
alter table public."tasks" add column if not exists "created_at" timestamptz default now();
alter table public."tasks" add column if not exists "created_by" uuid;
alter table public."tasks" add column if not exists "department_id" text;
alter table public."tasks" add column if not exists "description" text;
alter table public."tasks" add column if not exists "due_date" date;
alter table public."tasks" add column if not exists "estimated_hours" numeric;
alter table public."tasks" add column if not exists "goal_id" text;
alter table public."tasks" add column if not exists "links" jsonb;
alter table public."tasks" add column if not exists "origin_document_id" text;
alter table public."tasks" add column if not exists "origin_event_id" text;
alter table public."tasks" add column if not exists "parent_task_id" text;
alter table public."tasks" add column if not exists "priority" text;
alter table public."tasks" add column if not exists "source" text;
alter table public."tasks" add column if not exists "status" text;
alter table public."tasks" add column if not exists "tags" jsonb;
alter table public."tasks" add column if not exists "title" text;
alter table public."tasks" add column if not exists "updated_at" timestamptz default now();
alter table public."tasks" add column if not exists "workflow_id" text;
create index if not exists "tasks_company_id_idx" on public."tasks" ("company_id");

create table if not exists public."time_entries" (id uuid primary key default gen_random_uuid());
alter table public."time_entries" add column if not exists "created_at" timestamptz default now();
alter table public."time_entries" add column if not exists "entry_type" text;
alter table public."time_entries" add column if not exists "location" text;
alter table public."time_entries" add column if not exists "notes" text;
alter table public."time_entries" add column if not exists "schedule_id" text;
alter table public."time_entries" add column if not exists "timestamp" text;
alter table public."time_entries" add column if not exists "updated_at" timestamptz default now();
alter table public."time_entries" add column if not exists "user_id" uuid;
create index if not exists "time_entries_user_id_idx" on public."time_entries" ("user_id");

create table if not exists public."time_off_requests" (id uuid primary key default gen_random_uuid());
alter table public."time_off_requests" add column if not exists "approved_at" timestamptz;
alter table public."time_off_requests" add column if not exists "approved_by" uuid;
alter table public."time_off_requests" add column if not exists "created_at" timestamptz default now();
alter table public."time_off_requests" add column if not exists "end_date" date;
alter table public."time_off_requests" add column if not exists "notes" text;
alter table public."time_off_requests" add column if not exists "reason" text;
alter table public."time_off_requests" add column if not exists "start_date" date;
alter table public."time_off_requests" add column if not exists "status" text;
alter table public."time_off_requests" add column if not exists "type" text;
alter table public."time_off_requests" add column if not exists "updated_at" timestamptz default now();
alter table public."time_off_requests" add column if not exists "user_id" uuid;
create index if not exists "time_off_requests_user_id_idx" on public."time_off_requests" ("user_id");

create table if not exists public."training_assignments" (id uuid primary key default gen_random_uuid());
alter table public."training_assignments" add column if not exists "company_id" uuid;
alter table public."training_assignments" add column if not exists "created_at" timestamptz default now();
alter table public."training_assignments" add column if not exists "updated_at" timestamptz default now();
alter table public."training_assignments" add column if not exists "employee_id" uuid;
alter table public."training_assignments" add column if not exists "metadata" jsonb;
alter table public."training_assignments" add column if not exists "module_id" text;
alter table public."training_assignments" add column if not exists "assigned_by" uuid;
alter table public."training_assignments" add column if not exists "status" text;
alter table public."training_assignments" add column if not exists "due_date" date;
alter table public."training_assignments" add column if not exists "completed_at" timestamptz;
create index if not exists "training_assignments_company_id_idx" on public."training_assignments" ("company_id");
create index if not exists "training_assignments_employee_id_idx" on public."training_assignments" ("employee_id");

create table if not exists public."training_modules" (id uuid primary key default gen_random_uuid());
alter table public."training_modules" add column if not exists "company_id" uuid;
alter table public."training_modules" add column if not exists "created_at" timestamptz default now();
alter table public."training_modules" add column if not exists "updated_at" timestamptz default now();
alter table public."training_modules" add column if not exists "employee_id" uuid;
alter table public."training_modules" add column if not exists "metadata" jsonb;
alter table public."training_modules" add column if not exists "title" text;
alter table public."training_modules" add column if not exists "description" text;
alter table public."training_modules" add column if not exists "category" text;
alter table public."training_modules" add column if not exists "level" text;
alter table public."training_modules" add column if not exists "duration_minutes" numeric;
alter table public."training_modules" add column if not exists "xp_reward" numeric;
alter table public."training_modules" add column if not exists "is_mandatory" boolean;
alter table public."training_modules" add column if not exists "created_by" uuid;
create index if not exists "training_modules_company_id_idx" on public."training_modules" ("company_id");
create index if not exists "training_modules_employee_id_idx" on public."training_modules" ("employee_id");

create table if not exists public."user_companies" (id uuid primary key default gen_random_uuid());
alter table public."user_companies" add column if not exists "company_id" uuid;
alter table public."user_companies" add column if not exists "created_at" timestamptz default now();
alter table public."user_companies" add column if not exists "role" text;
alter table public."user_companies" add column if not exists "user_id" uuid;
create index if not exists "user_companies_company_id_idx" on public."user_companies" ("company_id");
create index if not exists "user_companies_user_id_idx" on public."user_companies" ("user_id");

create table if not exists public."user_permissions" (id uuid primary key default gen_random_uuid());
alter table public."user_permissions" add column if not exists "created_at" timestamptz default now();
alter table public."user_permissions" add column if not exists "created_by" uuid;
alter table public."user_permissions" add column if not exists "permission_key" text;
alter table public."user_permissions" add column if not exists "permission_value" text;
alter table public."user_permissions" add column if not exists "updated_at" timestamptz default now();
alter table public."user_permissions" add column if not exists "user_id" uuid;
create index if not exists "user_permissions_user_id_idx" on public."user_permissions" ("user_id");

create table if not exists public."user_roles" (id uuid primary key default gen_random_uuid());
alter table public."user_roles" add column if not exists "created_at" timestamptz default now();
alter table public."user_roles" add column if not exists "department_id" text;
alter table public."user_roles" add column if not exists "role" text;
alter table public."user_roles" add column if not exists "user_id" uuid;
create index if not exists "user_roles_user_id_idx" on public."user_roles" ("user_id");

create table if not exists public."user_unavailability" (id uuid primary key default gen_random_uuid());
alter table public."user_unavailability" add column if not exists "created_at" timestamptz default now();
alter table public."user_unavailability" add column if not exists "created_by" uuid;
alter table public."user_unavailability" add column if not exists "end_time" timestamptz;
alter table public."user_unavailability" add column if not exists "is_recurring" boolean;
alter table public."user_unavailability" add column if not exists "reason" text;
alter table public."user_unavailability" add column if not exists "recurring_pattern" jsonb;
alter table public."user_unavailability" add column if not exists "start_time" timestamptz;
alter table public."user_unavailability" add column if not exists "updated_at" timestamptz default now();
alter table public."user_unavailability" add column if not exists "user_id" uuid;
create index if not exists "user_unavailability_user_id_idx" on public."user_unavailability" ("user_id");

create table if not exists public."v_training_completion_events" (id uuid primary key default gen_random_uuid());
alter table public."v_training_completion_events" add column if not exists "company_id" uuid;
alter table public."v_training_completion_events" add column if not exists "created_at" timestamptz default now();
alter table public."v_training_completion_events" add column if not exists "updated_at" timestamptz default now();
alter table public."v_training_completion_events" add column if not exists "employee_id" uuid;
alter table public."v_training_completion_events" add column if not exists "metadata" jsonb;
create index if not exists "v_training_completion_events_company_id_idx" on public."v_training_completion_events" ("company_id");
create index if not exists "v_training_completion_events_employee_id_idx" on public."v_training_completion_events" ("employee_id");

create table if not exists public."vendor_sync_logs" (id uuid primary key default gen_random_uuid());
alter table public."vendor_sync_logs" add column if not exists "company_id" uuid;
alter table public."vendor_sync_logs" add column if not exists "created_at" timestamptz default now();
alter table public."vendor_sync_logs" add column if not exists "updated_at" timestamptz default now();
create index if not exists "vendor_sync_logs_company_id_idx" on public."vendor_sync_logs" ("company_id");

create table if not exists public."vendor_visits" (id uuid primary key default gen_random_uuid());
alter table public."vendor_visits" add column if not exists "company_id" uuid;
alter table public."vendor_visits" add column if not exists "contact_email" text;
alter table public."vendor_visits" add column if not exists "contact_phone" text;
alter table public."vendor_visits" add column if not exists "created_at" timestamptz default now();
alter table public."vendor_visits" add column if not exists "description" text;
alter table public."vendor_visits" add column if not exists "end_time" timestamptz;
alter table public."vendor_visits" add column if not exists "integration_id" text;
alter table public."vendor_visits" add column if not exists "integration_type" text;
alter table public."vendor_visits" add column if not exists "linked_event_id" text;
alter table public."vendor_visits" add column if not exists "location" text;
alter table public."vendor_visits" add column if not exists "service_type" text;
alter table public."vendor_visits" add column if not exists "start_time" timestamptz;
alter table public."vendor_visits" add column if not exists "vendor_name" text;
create index if not exists "vendor_visits_company_id_idx" on public."vendor_visits" ("company_id");

create table if not exists public."week_templates" (id uuid primary key default gen_random_uuid());
alter table public."week_templates" add column if not exists "company_id" uuid;
alter table public."week_templates" add column if not exists "created_at" timestamptz default now();
alter table public."week_templates" add column if not exists "created_by" uuid;
alter table public."week_templates" add column if not exists "description" text;
alter table public."week_templates" add column if not exists "name" text;
alter table public."week_templates" add column if not exists "template_data" jsonb;
alter table public."week_templates" add column if not exists "updated_at" timestamptz default now();
create index if not exists "week_templates_company_id_idx" on public."week_templates" ("company_id");

create table if not exists public."work_schedules" (id uuid primary key default gen_random_uuid());
alter table public."work_schedules" add column if not exists "company_id" uuid;
alter table public."work_schedules" add column if not exists "created_at" timestamptz default now();
alter table public."work_schedules" add column if not exists "updated_at" timestamptz default now();
create index if not exists "work_schedules_company_id_idx" on public."work_schedules" ("company_id");

create table if not exists public."workflow_step_instances" (id uuid primary key default gen_random_uuid());
alter table public."workflow_step_instances" add column if not exists "assigned_to" uuid;
alter table public."workflow_step_instances" add column if not exists "completed_at" timestamptz;
alter table public."workflow_step_instances" add column if not exists "created_at" timestamptz default now();
alter table public."workflow_step_instances" add column if not exists "notes" text;
alter table public."workflow_step_instances" add column if not exists "started_at" timestamptz;
alter table public."workflow_step_instances" add column if not exists "status" text;
alter table public."workflow_step_instances" add column if not exists "step_id" text;
alter table public."workflow_step_instances" add column if not exists "updated_at" timestamptz default now();
alter table public."workflow_step_instances" add column if not exists "workflow_instance_id" text;

create table if not exists public."workflow_steps" (id uuid primary key default gen_random_uuid());
alter table public."workflow_steps" add column if not exists "assigned_role" text;
alter table public."workflow_steps" add column if not exists "assigned_user_id" text;
alter table public."workflow_steps" add column if not exists "auto_assign" boolean;
alter table public."workflow_steps" add column if not exists "conditions" jsonb;
alter table public."workflow_steps" add column if not exists "created_at" timestamptz default now();
alter table public."workflow_steps" add column if not exists "description" text;
alter table public."workflow_steps" add column if not exists "estimated_duration" text;
alter table public."workflow_steps" add column if not exists "name" text;
alter table public."workflow_steps" add column if not exists "required" boolean;
alter table public."workflow_steps" add column if not exists "step_number" numeric;
alter table public."workflow_steps" add column if not exists "step_type" text;
alter table public."workflow_steps" add column if not exists "updated_at" timestamptz default now();
alter table public."workflow_steps" add column if not exists "workflow_id" text;

create table if not exists public."workflows" (id uuid primary key default gen_random_uuid());
alter table public."workflows" add column if not exists "created_at" timestamptz default now();
alter table public."workflows" add column if not exists "created_by" uuid;
alter table public."workflows" add column if not exists "department_id" text;
alter table public."workflows" add column if not exists "description" text;
alter table public."workflows" add column if not exists "is_template" boolean;
alter table public."workflows" add column if not exists "name" text;
alter table public."workflows" add column if not exists "status" text;
alter table public."workflows" add column if not exists "trigger_conditions" jsonb;
alter table public."workflows" add column if not exists "updated_at" timestamptz default now();



do $$
begin
  if to_regclass('public.calendar_events_full') is null then
    execute 'create view public."calendar_events_full" as select null::jsonb as "attendees", null::jsonb as "checklist", null::text as "color", null::uuid as "company_id", null::timestamptz as "created_at", null::uuid as "created_by", null::text as "description", null::timestamptz as "end_time", null::text as "event_type", null::uuid as "id", null::text as "location", null::jsonb as "metadata", null::jsonb as "participants", null::text as "related_shift_id", null::jsonb as "related_shift_ids", null::timestamptz as "start_time", null::text as "store_id", null::text as "title", null::timestamptz as "updated_at", null::jsonb as "vendor" where false';
  end if;
end $$;

do $$
begin
  if to_regclass('public.calendar_unified_view') is null then
    execute 'create view public."calendar_unified_view" as select null::uuid as "company_id", null::timestamptz as "created_at", null::uuid as "created_by", null::text as "description", null::timestamptz as "end_time", null::text as "event_type", null::uuid as "id", null::text as "service_type", null::timestamptz as "start_time", null::text as "title", null::timestamptz as "updated_at", null::text as "vendor_id", null::text as "vendor_name" where false';
  end if;
end $$;

do $$
begin
  if to_regclass('public.recognitions') is null then
    execute 'create view public."recognitions" as select null::text as "badge_description", null::text as "badge_icon_url", null::text as "badge_id", null::text as "badge_name", null::text as "badge_slug", null::timestamptz as "earned_at", null::uuid as "id", null::text as "recipient_avatar", null::text as "recipient_name", null::numeric as "threshold_xp", null::uuid as "user_id", null::numeric as "xp_snapshot" where false';
  end if;
end $$;

do $$
begin
  if to_regclass('public.vendor_event') is null then
    execute 'create view public."vendor_event" as select null::uuid as "company_id", null::text as "description", null::timestamptz as "end_time", null::date as "event_date", null::date as "event_end_date", null::uuid as "id", null::text as "location", null::text as "service_type", null::timestamptz as "start_time", null::text as "vendor_name" where false';
  end if;
end $$;



grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;

grant all on all tables in schema public to service_role;

grant all on all sequences in schema public to authenticated, service_role;



-- Keep future tables accessible to the app roles during stabilization.

alter default privileges in schema public grant select on tables to anon;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public grant all on tables to service_role;

