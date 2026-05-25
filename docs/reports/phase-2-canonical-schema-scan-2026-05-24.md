# Phase 2 Canonical Schema Scan

Date: 2026-05-24

## Correction

The prior finance categorization work was based on the wrong app prompt and has been removed. FlowForce does not contain that mobile transaction review UI or `categories.createCategory` path.

## Docker Decision

Yes, Docker is required for the Phase 2 database work in this repo.

Supabase CLI can push linked migrations without Docker, but the shipment gate needs Docker for:

- linked schema dumps
- local Supabase stack startup
- fresh `supabase db reset`
- validating that source-controlled migrations can recreate the app contract

Docker Desktop was not available on this machine, so Colima was started instead. Because the shell still had an old Docker Desktop socket in `DOCKER_HOST`, Docker/Supabase commands were run with:

```sh
env -u DOCKER_HOST <command>
```

The full local Supabase stack needed this Colima-compatible start command:

```sh
env -u DOCKER_HOST npx supabase start --exclude vector
```

Reason: the `vector` service tries to bind the Docker socket and failed against the Colima socket path. Excluding `vector` still allowed the database, REST API, auth, storage, studio, and migration reset gates to run.

## What Phase 2 Found

The remote and local public schema dumps initially contained only these source-controlled public functions:

- `current_user_company_ids`
- `current_user_is_company_admin`
- `handle_new_user` on remote
- `set_updated_at`

The app was calling more RPCs than migrations could recreate. The old contract check used `supabase.rpc(..., { head: true })`, which returned success for missing RPCs. A real RPC call returned `PGRST202`.

The migration-defined views were also placeholders:

- `calendar_events_full`
- `calendar_unified_view`
- `recognitions`
- `vendor_event`

## Implemented In Phase 2

New forward migrations:

- `supabase/migrations/20260524000200_phase2_app_contract_rpcs_and_views.sql`
- `supabase/migrations/20260524000300_phase2_storage_contract.sql`

It adds/source-controls:

- `assert_company_membership`
- `create_company_invite`
- `create_company_with_setup`
- `get_ai_kpi_insights`
- `get_company_roles`
- `get_dashboard_stats`
- `get_kpi_summary`
- `get_recipient_insights`
- `log_audit_event`
- `replace_event_participants`
- `replace_event_shift_links`
- `trigger_onboarding_checklist`

It also:

- replaces the four placeholder views with real definitions
- adds app-required columns to `audit_log`
- adds app-required columns/indexes to `event_participants`
- adds app-required columns/indexes to `event_shift_links`
- adds `vendor_visits.updated_at`
- grants authenticated read access to the replacement views
- reloads PostgREST schema cache

Contract checker update:

- real read RPC calls replace the misleading `head: true` probe
- mutating RPC existence is checked through safe no-op/invalid probes
- anon data exposure checks remain enforced
- core RLS status is verified
- sensitive anon grants are verified absent
- required storage buckets and storage policies are verified

Storage contract:

- `company-assets`
- `form-audio`
- `form-images`
- `form-signatures`
- `form-uploads`
- `form-videos`
- `message-attachments`
- `operations-reports`
- `attachments`

Current app code uses public URLs for these uploads, so these buckets are intentionally public in Phase 2. Write/delete scope is policy-controlled where current path conventions allow it: company assets are company-prefixed, message attachments are user-prefixed, and form/report buckets are authenticated-write public-read until form submissions gain company-prefixed storage paths.

Types:

- `src/integrations/supabase/types.ts` was regenerated from the linked Supabase schema.
- `supabase/database.types.ts` was regenerated from the linked Supabase schema.

## Applied Remotely

The Phase 2 migration was pushed to the linked Supabase project.

Remote status after push:

```text
Remote database is up to date.
```

Remote contract check after push:

```text
0 missing relations
0 relation errors
0 missing read RPCs
0 read RPC errors
0 missing mutating RPCs
0 anon exposures
0 security contract errors
```

## Local Reconstruction Gate

Local Supabase was started with Colima and `vector` excluded.

Fresh reset command:

```sh
env -u DOCKER_HOST npx supabase db reset
```

Result:

```text
Finished supabase db reset on branch main.
```

Local contract check after reset:

```text
0 missing relations
0 relation errors
0 missing read RPCs
0 read RPC errors
0 missing mutating RPCs
0 anon exposures
0 security contract errors
```

## Remaining Shipment Work

These items are not finished yet and should stay visible:

1. Add two-tenant RLS tests for core tables and high-risk modules.
2. Replace the giant restore migration with domain migrations.
3. Remove production demo fallbacks for missing tenant context.
4. Add behavior tests for the new transactional company setup RPC.
5. Add module smoke tests that prove replacement views return real seeded data.
6. Move form/report storage paths to company-prefixed keys so public-read buckets can be revisited or replaced with signed URLs.

## Important Note

Do not add new product schema for unrelated apps during this phase. The work should match FlowForce code references and the existing FlowForce database contract.
