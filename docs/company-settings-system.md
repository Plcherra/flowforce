# Company Settings System

Date: 2026-05-27

## Source Of Truth

Company settings use two layers:

- `companies`: operational source of truth for values used across the app.
- `system_settings`: editable settings snapshot grouped by settings panel.

The following fields must always propagate to `companies` because downstream modules read them directly:

- `companies.name`
- `companies.description`
- `companies.website`
- `companies.phone`
- `companies.logo_url`
- `companies.primary_color`
- `companies.secondary_color`
- `companies.timezone`
- `companies.currency`
- `companies.working_hours`

The `system_settings` row stores the panel snapshot:

- `general`
- `security`
- `localization`
- `notifications`
- `integrations`
- `appearance`
- `admin_config`

## Save Behavior

General settings update both the company profile fields and the settings snapshot. Brand colors are editable in the company profile panel and are saved to `companies.primary_color`, `companies.secondary_color`, and `system_settings.appearance`.

Localization settings update `companies.timezone`, `companies.currency`, and `system_settings.localization`.

Every `updateSettings` call emits the `system_settings.updated` audit event through `log_audit_event`.

## Propagation

- `useCurrency()` reads `companies.currency`.
- Analytics reports use `useCurrency()` for visible money formatting.
- Settings normalization prefers company-level currency, timezone, and brand values when loading settings.
- Scheduling, inventory, finance, and reports should read company-level configuration before falling back to defaults.

## Verification

Run:

```bash
npm run check:settings
```

This confirms:

- Settings saves are audited.
- Profile and brand settings propagate to `companies`.
- Currency and timezone saves update `companies` and `system_settings`.
- Analytics visible currency formatting reads company configuration.
