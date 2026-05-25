# Phase 9 Tenant Repair UX

Date: 2026-05-24

## Scope

Phase 9 replaces missing tenant-context null states with a deliberate setup-required screen at the authenticated app-shell boundary.

## Implemented

- Added `src/app-shell/tenant/TenantSetupRequired.tsx`.
  - Shows a polished `No company detected` state.
  - Explains that sign-in succeeded but tenant linkage is missing.
  - Displays a short support reference from the user id.
  - Provides `Repair workspace`, `Retry connection`, `Setup`, and `Sign out` actions.
- Updated `src/app-shell/AppShell.tsx`.
  - Waits for profile loading before rendering the shell.
  - Blocks tenant modules when `profile.companyId` is missing.
  - Renders the repair screen instead of sidebar/page content.
- Added `app/api/onboarding/repair/route.ts`.
  - Verifies the current bearer session.
  - Reads signup metadata from the authenticated user.
  - Calls `create_company_with_setup` to create or repair the tenant baseline.
  - Updates user metadata with the repaired company id and slug.

## Validation

- `npm run typecheck` passed.
- Browser verification with a temporary broken auth user:
  - signing in without a profile/company shows `No company detected`.
  - tenant modules are not rendered before repair.
  - `Repair workspace` calls `/api/onboarding/repair`.
  - after repair, the same `/app/settings` route renders the real app shell and company settings.
  - generated user/company rows were cleaned up after verification.

## Remaining Risk

After repair, existing custom-section loading still reports unrelated schema/permission issues:

- missing relationship between `custom_sections` and `custom_section_pages`
- missing `authenticated` grant for `section_templates`

Those are not missing-tenant UX failures, but they should be handled in the upcoming domain migration cleanup or module smoke-test phase.

The next shipment item is signed URL/private bucket posture for sensitive files.
