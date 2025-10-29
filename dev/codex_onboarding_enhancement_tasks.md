# ConnectFlow Onboarding Enhancements

## First-Time Flow Gaps
- `src/components/navigation/NavigationGuard.tsx:18` hard-redirects any authenticated visitor to `/app/dashboard`, skipping checks for onboarding status, company metadata, or pending setup tasks.
- `src/components/ProtectedRoute.tsx:10` only validates session presence; accounts created through `company-registration` can hit `/app/*` even if templates, roles, or sections were not persisted.
- `src/router/index.tsx:76` maps `/onboarding` to `/company-registration` and lacks an `/app/onboarding` resume route, so first-time admins cannot re-enter the wizard after authentication.
- `src/pages/CompanyRegistration.tsx:14` relies on `useCompanyRegistration` but never signals completion back to routing/metadata, leaving no flag for `NavigationGuard` or Sidebar logic.
- `src/data/navigationData.tsx:121` exposes the “Admin & Setup” cluster immediately, yet none of those links surface inline guidance or enforce prerequisite configuration steps.

## 5-Step Onboarding Wizard (Admin & Setup Anchored)
1. **Account & Organization Basics**
   - Reuse the existing step one state in `src/components/onboarding/EnhancedOnboardingWizard.tsx:119` to capture owner profile, company name, and industry, but persist a `setup_progress.account` flag via `useCompanyRegistration` (`src/hooks/useCompanyRegistration.tsx:95`) after validation.
   - Extend the Supabase RPC payload with a boolean or enum indicating this step’s completion so `NavigationGuard` can respect it before redirecting to `/app/dashboard`.

2. **Module & Section Selection**
   - Surface the section toggles already used in `UnifiedSectionsManager` (mounted through `src/pages/SectionsPermissions.tsx:52`) inside the wizard so owners choose enabled modules up front.
   - Write changes back to the same shape expected by the Sections & Permissions page, ensuring Admin users see their choices reflected when they later visit `/app/sections-permissions`.

3. **Roles, Permissions, and Teams**
   - Embed the `RoleConfigurationTab` patterns referenced in `src/pages/Admin.tsx:60` and the onboarding role manager hooks so owners can seed default roles/positions during onboarding.
   - Persist role/position output through `useCompanyRegistration` (`src/hooks/useCompanyRegistration.tsx:30-49`) to avoid duplicating logic with the Admin tab.

4. **Items & Setup Seed Data**
   - Offer an optional quick-start import that leverages the inventory hooks already wired in `src/pages/ItemsSetup.tsx:26` to load starter categories, suppliers, or SKUs.
   - If the owner skips, record that choice (e.g., `setup_progress.inventory = 'pending'`) so `/app/items-setup` can show a resume banner on first visit.

5. **Launch Checklist & Admin Hand-off**
   - Finalize with a review step that links directly to `/app/admin?tab=users`, `/app/sections-permissions`, and `/app/settings` using the normalized paths produced by `useActiveNavigation` (`src/hooks/useActiveNavigation.tsx:33`).
   - Mark onboarding complete in Supabase metadata, then allow `NavigationGuard` to redirect new sessions to `/app/admin?tab=users` until the flag is set.

## Contextual Help System
- Inject a persistent help entry point in `src/components/AppShell.tsx:18`, opening a contextual drawer that maps the active route (from `useLocation`) to targeted docs under `src/routes/resourceRoutes.tsx:12`.
- Prebuild route-to-help metadata so visiting Admin/Setup pages deep-links to `/app/resources/docs/getting-started` or relevant `DocumentationDetail` slugs without leaving the flow.
- Expose inline “Need help?” affordances on wizard steps that hydrate a filtered list from the resources loader in `src/pages/Resources.tsx:64`, keeping guidance consistent between onboarding and post-launch usage.

## Implementation Tasks
- Add onboarding state to auth context (extend `useAuth` or introduce a profile hook) and gate redirects in both `NavigationGuard` and `ProtectedRoute`.
- Register `/app/onboarding` (plus resume tokens) inside `src/router/index.tsx` so authenticated owners can return to the wizard.
- Update `navigationSections` to surface a progress badge beside “Admin & Setup” until onboarding flags are complete, nudging owners to finish setup before exploring other areas.
