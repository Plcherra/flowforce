# ConnectFlow Branding & White-Label Tasks

## Theme System (Current)
- `AppearanceSettings` tracks theme mode, three branding colors, logo placement, sidebar background, dashboard layout, and preview metadata (`src/types/system-settings.ts:82`).
- `DEFAULT_APPEARANCE` seeds tenant defaults and `normalizeAppearance` merges stored values with company-level overrides, keeping colors in sync with `companies.primary_color` and `secondary_color` (`src/hooks/useSystemSettings.ts:105`, `src/hooks/useSystemSettings.ts:353`).
- Appearance and branding controls live in their own panel inside `src/modules/system/components`; see the modular architecture doc for the latest entry point.
- Previewing themes updates local state only and sets a 30-minute expiry, while publishing persists to Supabase and refreshes cached settings (see new modular hooks in `src/modules/system/hooks`).
- `updateAppearance` also pushes colors to the company profile so other modules can reuse the palette; preview snapshots are stored but currently unused elsewhere (`src/hooks/useSystemSettings.ts:1024`).

## Business Branding UI (Current)
- `GeneralSettingsPanel` lets admins manage name, site, contacts, HQ address, and description with immediate dirty-state tracking and reset support (`src/modules/system/components/GeneralSettingsPanel.tsx`).
- Logo uploads stream to the `company-assets` bucket, fetching a public URL for reuse across dashboards, emails, and reports (`src/hooks/useSystemSettings.ts:552`).
- Role-guarded access ensures only administrators reach the settings shell, with badges reflecting permission state (`src/modules/system/components/SystemSettingsLayout.tsx`).
- Saving general settings updates both `system_settings.general` and the parent `companies` row, keeping downstream consumers aligned (`src/hooks/useSystemSettings.ts:680`).
- Branding controls in onboarding (`src/components/onboarding/BrandingCustomizer.tsx`) duplicate color pickers; consolidating these with the appearance panel will reduce drift.

## White-Label Deployment Plan
- Build a theme token pipeline that hydrates Tailwind CSS variables and runtime providers from `AppearanceSettings`, ensuring global components reflect tenant colors at load.
- Formalize preview publishing: persist snapshots, add rollback, and surface countdown UX tied to `preview.expiresAt`.
- Expand asset branding to include favicons, mobile icons, and email headers with versioned storage and cache-busting.
- Introduce tenant-aware shell initialization (domain mapping + settings prefetch) so white-label deployments auto-apply branding before first paint.
- Document the admin workflow and add regression coverage (Playwright + unit hooks) for theme edits, logo uploads, and preview flows.
