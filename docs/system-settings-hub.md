# System Settings Hub

The System Settings hub consolidates company configuration into one place. The hub is accessible to roles with administrative privileges (`admin`, `company_admin`, `owner`, and approved `manager` roles).

## Tabs and Capabilities

- **General** – Company name, website, contact details, and logo upload. Saving updates both Supabase `companies` and the `system_settings.general` snapshot.
- **Security** – Two-factor enforcement, password rules, and session timeout. Changes persist in `system_settings.security`.
- **Localization** – Timezone, language, currency, and regional formats. Timezone/currency sync to the `companies` table while the full config lives in `system_settings.localization`.
- **Notifications** – Default delivery channels, digest schedule, per-module overrides, and escalation window with data stored in `system_settings.notifications`.
- **Integrations** – Connect/disconnect Toast, MarketMan, Connecteam integrations. Connections, metadata, and provider status are tracked in `system_settings.integrations` and Supabase tables.
- **Admin Configuration**:
  - **Business Structure** – Working hours saved to `companies.working_hours`; locations sync with `inv_locations`; departments stored in `system_settings.admin_config`.
  - **Role Templates** – Pull live company roles (via `useCompanyRoles`) and sync into `system_settings.admin_config.roleTemplates`.
  - **API Monitoring** – Webhook URL and thresholds stored in `system_settings.admin_config.apiMonitoring`.
  - **AI Co-Pilot** – Enablement, scopes, restrictions, and automation tier stored in `system_settings.admin_config.aiCopilot`.

## Underlying Data

- New Supabase table `system_settings` (see migration `20251103090000_create_system_settings.sql`) stores JSON snapshots per company.
- `useSystemSettings` hook (`src/modules/system/hooks/useSystemSettings.ts`) coordinates fetching/updating Supabase records, uploading logos, and refreshing state.
- UI components live in `src/modules/system/pages/SettingsPage.tsx` and related module components.

## Usage Tips

1. Access the hub via `/settings` while authenticated with an authorized role.
2. Each tab has explicit save actions; unsaved changes can be discarded locally.
3. Preview theme changes before saving to confirm appearance across modules.
4. Admin Configuration tabs keep the JSON snapshot aligned with underlying tables so automations (scheduling, analytics) stay accurate.
