# Tenant Model

Last updated: 2026-05-27

This is the v1 tenant ownership contract for FlowForce.

## Source Of Truth

`company_members` is the long-term source of tenant membership.

A user belongs to a company only when a row exists in:

```text
public.company_members(company_id, user_id)
```

`public.current_user_company_ids()` must derive tenant membership from `company_members`, not from `profiles.company_id`.

## Profile Current Company Shortcut

`profiles.company_id` is a current-company/default-company shortcut.

It can be used for:

- Selecting the user's default tenant after sign-in.
- Showing profile and employee directory context.
- Repairing onboarding state when `create_company_with_setup` is retried.
- Backfilling tenant ownership for legacy rows during controlled migrations.

It must not be used by itself to grant tenant access, admin access, or cross-tenant reads.

## Multi-Company Behavior

Users may belong to multiple companies through multiple `company_members` rows.

Rules:

- `company_members` defines every tenant a user can access.
- `profiles.company_id` points to the active/default company for UI convenience.
- Switching companies should update the user's current-company shortcut only after confirming membership.
- RLS policies should allow access to all companies returned by `current_user_company_ids()`.
- Server routes should verify the requested `companyId` through `assert_company_membership(companyId)` before sensitive work.

## Tenant Ownership Rules For New Tables

Every new tenant-owned table must choose one ownership pattern before it ships.

Preferred direct ownership:

```text
company_id uuid not null references public.companies(id)
```

Required for direct ownership:

- `company_id` column.
- Index on `company_id`.
- RLS enabled.
- Authenticated policy using `company_id in (select public.current_user_company_ids())`.
- Matching `with check` policy for writes.
- Any user/profile foreign keys must belong to the same `company_id`.

Derived ownership is allowed only for child tables whose tenant is inherited from a parent row, such as a form field inheriting from a form.

Required for derived ownership:

- Parent foreign key.
- Trigger, generated value, or strict write policy that derives/checks tenant ownership.
- RLS policy that joins through the parent and checks `current_user_company_ids()`.
- Tests proving cross-company parent/child mismatches are blocked.

Global reference tables are allowed only when the data is truly shared across all tenants. They must not contain customer-specific data.

## Server And RPC Rules

- Browser reads and low-risk writes must rely on RLS.
- Server routes must verify membership server-side before service-role work.
- Admin writes must use `current_user_is_company_admin(companyId)` or an equivalent company-members role check.
- RPCs that accept `company_id` must call `assert_company_membership(company_id)` unless they are service-role-only maintenance routines.

## Existing Enforcement

Current enforcement points:

- `public.current_user_company_ids()`
- `public.current_user_is_company_admin(company_id)`
- `public.assert_company_membership(company_id)`
- tenant isolation tests in `supabase/tests/phase3_tenant_isolation.test.sql`
- broader RLS/security tests in `supabase/tests/phase4_*` through `phase21_*`
- schema/security contract checks in `scripts/check-supabase-contract.mjs`

## Migration Rule

Do not add a tenant-owned table without also adding the tenant ownership rule, RLS policy, and a test or contract entry in the same phase.
