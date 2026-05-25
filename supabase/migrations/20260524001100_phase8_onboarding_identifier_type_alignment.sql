-- Phase 8 follow-up: align remote onboarding identifier columns with the
-- source-controlled schema. Template and role identifiers come from app
-- templates and can be non-UUID strings.

alter table public.companies
  alter column template_id type text using template_id::text;

alter table public.positions
  alter column role_id type text using role_id::text;
