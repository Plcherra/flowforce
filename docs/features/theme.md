# Theme

Active. The roadmap marks this file for the 6 AM run. When every phase here is checked, update `docs/roadmap.md`: this row becomes done, Languages becomes active, and the run opens [docs/features/languages.md](languages.md).

## Goal

FlowForce has one brand palette. The signed-in app offers three themes and nothing else: FlowForce, Light, and Dark. FlowForce is the blue the signed-in app already paints from the company colors, baked into `:root` as fixed tokens. Light and Dark are that same blue on different surfaces. There is no color picker, no palette picker, and no company accent.

A simple switch in Settings stores the choice in this browser. Pages then stop hard-coding Tailwind palette classes and hex colors, and use the shared tokens instead.

## Audit

Counted on 2026-10-22. These are the numbers a phase has to drive down.

The design tokens live in `app/globals.css`. `:root` is the light brand. `.dark` exists, and `tailwind.config.ts` sets `darkMode: ["class"]`. Nothing adds the `dark` class. `next-themes` is in `package.json` and is not imported.

`CompanyThemeSync` reads `companies.primary_color` and `companies.secondary_color` and `applyCompanyTheme` in `src/lib/theme/companyTheme.ts` overwrites tokens at runtime. The code defaults, the column defaults, and `src/hooks/useCompany.tsx` are `#3b82f6` and `#1e40af` (`supabase/migrations/20260509000100_align_onboarding_schema.sql`, `app/api/onboarding/complete/route.ts`). `hexToHslChannels` and `hexToForegroundChannels` turn that pair into the signed-in set:

- `--primary`, `--ring`, `--sidebar-primary`: `217 91% 60%`
- `--primary-foreground`, `--sidebar-primary-foreground`: `210 40% 98%`
- `--secondary`, `--brand-secondary`: `226 71% 40%`
- `--secondary-foreground`: `210 40% 98%`
- `--logo-background`: `#ffffff`
- `--logo-foreground`: `222.2 47.4% 11.2%`

`accentColor` `#0ea5e9` is stored on appearance and is not applied. The stylesheet mint `--primary` `174 78% 72%` and lavender `--secondary` `259 76% 87%` show only until the company loads. `--accent` and `--tertiary` stay `270 80% 90%`. `--accent` is the hover and selected row in menus, the calendar, and selects. `--tertiary` is that same lavender and is only the unused tertiary button variant in `src/components/ui/button.tsx`. Nothing else in the app uses the mint or the old secondary lavender. The logo plate default is `#ffffff`.

`AppearanceSettings` in `src/types/system-settings.ts` also has `theme` (`light` | `dark` | `system`), `accentColor`, `logoPlacement`, `sidebarBranding`, `dashboardLayout`, and `preview`. No screen reads `theme`, `logoPlacement`, `sidebarBranding`, or `dashboardLayout`. The accent picker is the onboarding preview only. `applyCompanyTheme` does not set `--accent`.

Color choice UI:

- `src/features/system/components/GeneralSettingsPanel.tsx` — primary, secondary, and logo background.
- `src/features/onboarding/components/BrandingCustomizer.tsx`, `CompanyOnboardingWizard.tsx`, `EnhancedOnboardingWizard.tsx`, `CustomTemplateBuilder.tsx` — primary, secondary, and accent.
- `src/features/marketing/components/LandingFooter.tsx` — a moon button that only flips local state. It does not set `dark`.

Leave these alone. They are not the app theme:

- `positions.color` and the picker in `src/features/positions/components/PositionManagementDialog.tsx`.
- `schedules.color`.
- Rich-text color in `src/features/forms/components/builder/RichTextContentEditor.tsx` and `src/features/company-updates/wizard/RichTextEditor.tsx`.
- `GRADIENT_PRESETS` in `src/data/updateTemplates.ts` (a post background).
- The vendor list in `src/features/scheduling/constants/templates.ts`. The word palette there is the vendor list.

Hard-coded color, `src/` and `app/`:

- 2,248 numbered palette classes (`bg-blue-500` and the same pattern) in 241 files.
- 198 `black` or `white` palette classes.
- 374 hex colors in 76 files.
- 3,752 semantic token classes (`bg-primary`, `text-muted-foreground`, and the same pattern) already use the variables.

Largest palette piles: onboarding 315, scheduling 212, sections 207, marketing 189, ai 199, inventory 151, analytics 127, resources 115, tasks 115. Hex is concentrated in marketing (162) and onboarding (38).

Columns written today and read by the app: `companies.primary_color`, `companies.secondary_color`, `company_settings.primary_color`, `company_settings.secondary_color`, and `system_settings.appearance`. The latest `create_company_with_setup` body is in `supabase/migrations/20260918021000_onboarding_plant_system_roles.sql`. Do not edit that file. A later phase replaces the function.

## Decisions

These are locked for the auto run. Implement them. Do not edit this section while implementing a phase.

1. FlowForce is the signed-in blue, baked into `:root` before the override is removed. Use the audit list, which is `applyCompanyTheme` for `#3b82f6` and `#1e40af`. Do not bake `#0ea5e9`. Keep every `:root` token the override does not set, including the warm `--input` and `--sidebar-ring` `217.2 91.2% 59.8%`. Keep `--accent` and `--tertiary` at `270 80% 90%`, and their foregrounds at `222.2 47.4% 11.2%`. That lavender is the secondary accent on today's signed-in screen. Remove mint `174 78% 72%` and stylesheet secondary `259 76% 87%` from `:root`. They are not on screen after sign-in. Phase 3 deletes the picker and the override only after Phase 1 has baked this set, so the signed-in look does not change.
2. Light and Dark use that baked set for primary, secondary, accent, and tertiary, including the foregrounds. They do not get a new blue, and they do not get the mint back. Light is the FlowForce block with `--input` set to the neutral border already in the file, `214.3 31.8% 91.4%`. Every other Light token matches FlowForce, including `--sidebar-ring`. Dark keeps the current `.dark` surface tokens (`background`, `foreground`, `card`, `popover`, `muted`, `border`, `input`, `sidebar-background`, `sidebar-foreground`, `sidebar-accent`, `sidebar-border`) and the current `.dark` destructive pair `0 62.8% 30.6%` / `210 40% 98%`. Dark brand tokens copy FlowForce, so Dark `--primary`, `--ring`, and `--sidebar-primary` are `217 91% 60%`, and Dark `--sidebar-primary-foreground` is `210 40% 98%`. Do not keep Dark primary `175 100% 75%`, Dark secondary `129 42% 72%`, or Dark accent `257 63% 89%`. Leave `--sidebar-ring` as `217.2 91.2% 59.8%` in all three. The override does not change it.
3. Status colors that are already on the pages become four tokens, added once, not a new brand. FlowForce and Light: `--success` `142 76% 36%`, `--success-foreground` `210 40% 98%`, `--success-muted` `141 84% 93%`, `--warning` `41 96% 40%`, `--warning-foreground` `222.2 47.4% 11.2%`, `--warning-muted` `55 97% 88%`. Dark uses the same success and warning hues. Its muted pair is `--success-muted` `142 40% 16%` and `--warning-muted` `41 40% 16%`. Do not add more color tokens in later phases. Orange and amber use warning. Green, lime, and emerald use success.
4. The logo plate is `#ffffff` in all three themes, as `--logo-background`. No logo-color control. Logo image upload stays.
5. The switch has three values: `flowforce`, `light`, `dark`. Default is `flowforce`. There is no System option and no `prefers-color-scheme` follow. The choice is `localStorage` key `flowforce-theme`. Do not add a theme column.
6. The switch sits at the top of General settings and works when the company fields are read-only. It does not save the company. FlowForce and Light do not set the `dark` class. Dark sets `dark` and `data-theme="dark"` so existing `dark:` utilities follow the class.
7. Map hard-coded classes onto the tokens. Gray, slate, zinc, neutral, stone, black, and white become `background`, `foreground`, `muted`, `card`, or `border`. Blue, sky, cyan, teal, and indigo become `primary`. Violet, purple, and fuchsia become `secondary`. Pink and rose become `accent`. Red becomes `destructive`. Green, lime, and emerald become `success`. Yellow, amber, and orange become `warning`. Hex `#3b82f6`, `#0ea5e9`, and `#3F51B5` become `primary`. Hex `#1e40af` becomes `secondary`. Hex `#10b981` becomes `success`. A `dark:` palette class is deleted. The token moves under `.dark`.
8. Do not change `positions.color`, `schedules.color`, rich-text color, post gradient presets, or the vendor list.
9. Drop the theme columns only in the last phase, after no code reads or writes them.
10. Ship each phase with the Ship-To-Main rule: one commit on `main`, then push `main`. Do not open a pull request.

## Phases

Auto run: start at the first unchecked phase that is not blocked and does not depend on an unapplied migration. After that phase is green, continue to the next such phase in the same run if time allows. Each phase is its own commit on `main`. Append the Progress log as you go. Skip a blocked phase and log the skip.

A phase that adds a migration follows the Feature workflow migration rule. If the Progress log has `needs owner: supabase db push <migration>`, skip phases that depend on that migration and continue with phases that do not. `check:supabase:remote-drift` in deploy-readiness fails until the push lands. That is expected.

Color phases follow Decisions 3 and 7. Touch only the files named in that phase. Do not change layout. Do not edit a token value locked in Decisions 1 to 3.

### Phase 1 — Three token sets

- [x] Put FlowForce, Light, and Dark in `app/globals.css`.

Rules:

- Files: `app/globals.css`, and a new `src/lib/theme/themeTokens.test.ts`.
- Follow Decisions 1, 2, and 3. `:root` is FlowForce. Add `[data-theme="light"]` and keep `.dark` as Dark. Add `--brand-secondary`, the success and warning tokens, and `--logo-background` to `tailwind.config.ts` the same way `primary` is wired, and only those.
- Do not import `next-themes`. Do not add the switch in this phase. Do not delete `applyCompanyTheme` in this phase.

Done when:

- `:root` `--primary`, `--ring`, and `--sidebar-primary` are `217 91% 60%`. `--primary-foreground` and `--sidebar-primary-foreground` are `210 40% 98%`.
- `:root` `--secondary` and `--brand-secondary` are `226 71% 40%`, and `--secondary-foreground` is `210 40% 98%`.
- `:root` `--accent` and `--tertiary` are still `270 80% 90%`.
- `:root` does not contain `174 78% 72%` or `259 76% 87%`.
- Light differs from FlowForce only by `--input` `214.3 31.8% 91.4%`.
- Dark `--primary`, `--ring`, and `--sidebar-primary` are `217 91% 60%`, Dark secondary matches FlowForce, and Dark does not contain `175 100% 75%` or `129 42% 72%`.

Prove: Unit test `src/lib/theme/themeTokens.test.ts` reads `app/globals.css` and asserts those strings. Run it with the same jiti style as `scripts/test-tasks-page.mjs`.

### Phase 2 — Settings switch

- [x] Add the three-way switch and apply it before paint.

Rules:

- Files: a new `src/lib/theme/applyTheme.ts` with `src/lib/theme/applyTheme.test.ts`, `app/layout.tsx`, `src/features/system/components/GeneralSettingsPanel.tsx`, and `src/features/marketing/components/LandingFooter.tsx`.
- Follow Decisions 5 and 6. An inline script in `app/layout.tsx` reads `flowforce-theme` before React paints and sets `data-theme`. Unknown values become `flowforce`.
- The General panel shows FlowForce, Light, and Dark. Choosing one calls `applyTheme` and writes `localStorage`. It does not call company save.
- Remove the footer moon button. The viewport `themeColor` is `#ffffff` for FlowForce and Light, and `#020817` for Dark. Do not follow the OS scheme.
- `applyTheme` is the only place that toggles the `dark` class.

Done when:

- A reload keeps the chosen theme.
- A missing or unknown stored value shows FlowForce, with no `dark` class.
- The marketing footer has no dark-mode button.

Prove: Unit test `src/lib/theme/applyTheme.test.ts` covers the three names, an unknown value, and which class list each one sets.

### Phase 3 — Remove color choice

- [x] Stop company colors from painting the app, and remove the pickers.

Rules:

- Depends on Phase 1. Do not start until `:root` already has the baked blue. Removing the override before that would swap the signed-in screen back to mint.
- Files: `src/lib/theme/companyTheme.ts`, `src/app-shell/theme/CompanyThemeSync.tsx`, `src/features/system/components/GeneralSettingsPanel.tsx`, `src/features/system/hooks/useGeneralSettings.ts`, `src/features/system/hooks/systemSettingsDefaults.ts`, `src/features/system/hooks/systemSettingsNormalizer.ts`, `src/features/system/hooks/useSystemSettings.ts`, `src/hooks/useCompany.tsx`, `src/types/common.ts`, `src/features/profile/components/ProfileForm.tsx`, `src/features/profile/components/ProfileOverview.tsx`, `app/api/onboarding/complete/route.ts`, `src/features/onboarding/components/BrandingCustomizer.tsx`, `CompanyOnboardingWizard.tsx`, `EnhancedOnboardingWizard.tsx`, and `CustomTemplateBuilder.tsx`.
- Follow Decisions 1, 4, and 8. Delete primary, secondary, accent, and logo-background inputs. Keep logo upload.
- `CompanyThemeSync` may still pass the logo URL. It must not set a color variable. Delete `applyCompanyTheme` and the hex-to-HSL override.
- Company save and onboarding complete stop sending `primary_color` and `secondary_color`. Do not drop the columns in this phase.
- Do not remove the position picker, the shift color, the rich-text color, or the post gradients.

Done when:

- General settings has the theme switch and no color inputs.
- Signing in leaves `--primary` at `217 91% 60%` and `--secondary` at `226 71% 40%`.
- Creating a company does not send a primary or secondary color.

Prove: Unit test the save payload builder (extract it if it is inline) and assert the payload has no `primary_color`, `secondary_color`, `primaryColor`, or `secondaryColor`. Run it with the jiti runner.

### Phase 4 — Delete the unused theme model

- [x] Remove the dead appearance fields, `next-themes`, and freeze the hard-coded color list.

Rules:

- Files: `src/types/system-settings.ts`, `src/features/system/hooks/systemSettingsDefaults.ts`, `package.json`, `package-lock.json`, and a new `scripts/check-theme-colors.mjs` plus `scripts/theme-color-baseline.json`.
- Delete `ThemeMode`, `accentColor`, `logoPlacement`, `sidebarBranding`, `dashboardLayout`, and `preview` from the appearance type when nothing reads them. Stop writing those keys.
- Remove the `next-themes` dependency. Do not replace it.
- The check scans `src/`, `app/`, and `tests/` for numbered palette classes, `black` and `white` palette classes, and hex colors. Semantic tokens are allowed and are not in the baseline. The check fails when a match is not in the baseline. Generate the baseline from the tree so this phase is green. Later color phases delete baseline entries for the files they clean. Do not add a baseline entry for a new color.

Done when:

- `package.json` does not depend on `next-themes`.
- The appearance type no longer has a theme mode or a color field.
- `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`. Add `"check:theme-colors"` to `package.json`.

### Phase 5 — Shell and shared UI

- [ ] Move hard-coded colors in the shell and shared components onto the tokens.

Rules:

- Files: `src/app-shell/**` and `src/components/**`. Follow Decisions 3 and 7.
- `src/components/ui/chart.tsx` may keep its light and dark keys. Point them at the CSS variables.
- Update `scripts/theme-color-baseline.json` so those paths have no entries.

Done when:

- Those directories have no palette class and no hex color outside the exceptions in Decision 8.
- `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 6 — Auth and dashboard

- [ ] Move hard-coded colors in auth and dashboard onto the tokens.

Rules:

- Files: `src/features/auth/**` and `src/features/dashboard/**`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- Those directories are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 7 — Schedule

- [ ] Move hard-coded colors on Schedule onto the tokens.

Rules:

- Files: `src/features/scheduling/**`. Follow Decisions 3, 7, and 8. Leave `schedules.color` and the vendor list alone. Update the baseline.

Done when:

- Schedule classes use tokens, and the shift color value is still stored.
- `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 8 — Tasks

- [ ] Move hard-coded colors on Tasks onto the tokens.

Rules:

- Files: `src/features/tasks/**`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- That directory is clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 9 — Forms

- [ ] Move hard-coded colors on Forms onto the tokens.

Rules:

- Files: `src/features/forms/**`. Follow Decisions 3, 7, and 8. Leave the rich-text color picker. Update the baseline.

Done when:

- Form chrome uses tokens, and the rich-text color control is still there.
- `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 10 — Company updates

- [ ] Move hard-coded colors on Company updates onto the tokens.

Rules:

- Files: `src/features/company-updates/**`. Follow Decisions 3, 7, and 8. Leave rich-text color and `GRADIENT_PRESETS`. Update the baseline.

Done when:

- Update chrome uses tokens, and a post can still pick a gradient preset.
- `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 11 — Messages

- [ ] Move hard-coded colors in Messages onto the tokens.

Rules:

- Files: `src/features/messages/**` and `src/styles/messages.css`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- Those files are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 12 — Inventory

- [ ] Move hard-coded colors in Inventory onto the tokens.

Rules:

- Files: `src/features/inventory/**`. Follow Decisions 3 and 7. Variance and count status use success, warning, and destructive. Update the baseline.

Done when:

- That directory is clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 13 — Sections

- [ ] Move hard-coded colors in Sections onto the tokens.

Rules:

- Files: `src/features/sections/**` and `src/sections/**`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- Those directories are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 14 — Analytics

- [ ] Move hard-coded colors in Analytics onto the tokens.

Rules:

- Files: `src/features/analytics/**`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- That directory is clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 15 — AI and operations

- [ ] Move hard-coded colors in AI and operations onto the tokens.

Rules:

- Files: `src/features/ai/**` and `src/features/operations/**`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- Those directories are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 16 — Resources, employees, and profile

- [ ] Move hard-coded colors on those screens onto the tokens.

Rules:

- Files: `src/features/resources/**`, `src/features/employees/**`, and `src/features/profile/**`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- Those directories are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 17 — Roles, admin, and settings chrome

- [ ] Move hard-coded colors on roles, admin, permissions, and settings chrome onto the tokens.

Rules:

- Files: `src/features/roles/**`, `src/features/admin/**`, `src/features/permissions/**`, `src/features/system/**`, and `src/features/positions/**`. Follow Decisions 3, 7, and 8. Leave `positions.color` and its picker. Update the baseline.

Done when:

- Chrome uses tokens, and a position still has its own color.
- `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 18 — Learning, recognition, and calendar

- [ ] Move hard-coded colors on the remaining people screens onto the tokens.

Rules:

- Files: `src/features/learning/**`, `src/features/gamification/**`, `src/features/recognition/**`, `src/features/performance/**`, `src/features/calendar/**`, and `src/features/availability/**`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- Those directories are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 19 — Onboarding

- [ ] Move hard-coded colors in onboarding onto the tokens.

Rules:

- Files: `src/features/onboarding/**` and `src/features/templates/**`. Follow Decisions 3 and 7. The color pickers are already gone. Update the baseline.

Done when:

- Those directories are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 20 — Marketing and public pages

- [ ] Move hard-coded colors on the public pages onto the tokens.

Rules:

- Files: `src/features/marketing/**`, `app/**` except `app/globals.css`, and `src/styles/employee.css`. Follow Decisions 3 and 7. Update the baseline.

Done when:

- Those files are clean, and `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 21 — Remaining source

- [ ] Clear the leftover hard-coded colors.

Rules:

- Files: `src/data/**`, `src/lib/**`, `src/hooks/**`, `src/utils/**`, `src/shared/**`, and `src/constants/**`, plus any path still listed in the baseline. Follow Decisions 3, 7, and 8. Do not edit `GRADIENT_PRESETS`. Update the baseline to empty.

Done when:

- `scripts/theme-color-baseline.json` has no entries.
- `node scripts/check-theme-colors.mjs` exits 0.

Prove: `node scripts/check-theme-colors.mjs`.

### Phase 22 — Drop unused theme columns

- [ ] Drop the color columns after nothing reads them.

Rules:

- This phase depends on Phases 3 and 4. Do not start it while any file still selects or writes `primary_color`, `secondary_color`, or `system_settings.appearance`.
- Add the migration with `supabase migration new`. Do not invent the filename. Do not edit an older migration.
- Drop `companies.primary_color`, `companies.secondary_color`, `company_settings.primary_color`, and `company_settings.secondary_color`. Drop `system_settings.appearance` only when the column holds nothing except the theme keys this feature stopped writing.
- Replace `create_company_with_setup` from its latest body so the insert no longer names those columns. Search the migrations at implementation time. The body on 2026-10-22 is in `supabase/migrations/20260918021000_onboarding_plant_system_roles.sql`.
- Update `src/integrations/supabase/types.ts` and `supabase/database.types.ts` in the same commit.
- If the Supabase CLI can reach the linked project, apply it with `supabase db push`. Otherwise log `needs owner: supabase db push <migration>` and stop. No later theme phase depends on the push.

Done when:

- The columns are gone from the migration and from both type files.
- App code does not mention `primary_color` or `secondary_color`.
- The Progress log says the push landed, or it says `needs owner: supabase db push <migration>`.

Prove: `npm run typecheck`. A unit test is not required for the SQL. If the push did not run here, the phone step is the owner running that command.

## Open questions

None. Pedro answered on 2026-10-22: keep the blue he sees when signed in.

## Progress log

### 2026-10-22 — Plan

Shipped: this file. No app code, no migration, no theme behavior change.

Blockers: none.

Questions: Confirm the brand is the CSS palette, if the company blue is what should stay.

### 2026-10-22 — Signed-in blue is FlowForce

Shipped: Decision 1 now bakes `#3b82f6` / `#1e40af` into `:root` before the picker is removed. Light and Dark derive from that blue. Mint and the old secondary lavender come out. The lavender accent and tertiary stay, because that is the hover accent still on screen after sign-in. No app code.

Blockers: none.

Questions: none.

### 2026-10-22 — Phase 1 Three token sets

Shipped: `:root` is the signed-in FlowForce blue. `[data-theme="light"]` matches that set except `--input` `214.3 31.8% 91.4%`. `.dark` keeps its surface tokens and uses the same blue, secondary, accent, and tertiary. Success, warning, `--brand-secondary`, and `--logo-background` are in the stylesheet and in `tailwind.config.ts`. The company color override is still in place.

Proven: Unit test `src/lib/theme/themeTokens.test.ts` reads `app/globals.css` and asserts the baked strings. Run with jiti the same way as `scripts/test-tasks-page.mjs`. It passed. ESLint passed on `src/lib/theme/themeTokens.test.ts` and `tailwind.config.ts`.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk. The signed-in blue should look the same as before this deploy. This phase does not add a switch yet.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 2 Settings switch

Shipped: General settings has FlowForce, Light, and Dark at the top. Choosing one calls `applyTheme` and writes `flowforce-theme` in this browser. It does not save the company, and it stays usable when the company fields are read-only. An inline script in `app/layout.tsx` applies the stored value before paint. A missing or unknown value is FlowForce, with no `dark` class. Dark sets `dark` and `data-theme="dark"`. The viewport color is `#ffffff` for FlowForce and Light, and `#020817` for Dark. The marketing footer moon button is gone.

Proven: Unit test `src/lib/theme/applyTheme.test.ts` covers the three names, an unknown value, and the class list each one sets. Run with jiti the same way as `scripts/test-tasks-page.mjs`. It passed. `npm run typecheck:app` and `npm run typecheck:src` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Settings, then General.
2. The theme switch sits at the top: FlowForce, Light, and Dark. It is there even if the company fields are read-only.
3. Tap Dark. The app should turn dark immediately, and Save changes should stay disabled if nothing else was edited.
4. Reload. Dark should still be on.
5. Tap FlowForce, reload, and confirm the signed-in blue is back and the page is not using the dark class.
6. Open the public marketing page. The footer should have no moon button and no Dark mode label.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 3 Remove color choice

Shipped: Signing in no longer paints company colors. `applyCompanyTheme` and the hex-to-HSL override are gone. `CompanyThemeSync` passes the logo URL only. General settings keeps the theme switch and the logo upload, and the primary, secondary, accent, and logo-background inputs are gone. Company save, demo company create, and onboarding complete no longer send `primary_color`, `secondary_color`, `primaryColor`, or `secondaryColor`. The columns stay. Position color, shift color, rich-text color, and post gradients are unchanged. `CustomTemplateBuilder` still stores the branding object its type requires; the color inputs it used to show lived in `BrandingCustomizer` and are removed.

Proven: Unit test `src/lib/theme/companySavePayload.test.ts` asserts the general save, the appearance save, the onboarding payload, and the create-company payload have none of those keys. Run with jiti the same way as `scripts/test-tasks-page.mjs`. It passed. `npm run typecheck:src` and `npm run typecheck:app` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk. Buttons and links should stay the FlowForce blue. They should not switch to a company-picked color.
2. Open Settings, then General. The theme switch is at the top. There should be no primary color, secondary color, accent, or logo background field. Logo upload should still be there.
3. Change the company name and save. Reload. The name should stick, and the blue should be unchanged.
4. Start creating a company. The branding step should not ask for a primary or secondary color.

Blockers: none. No migration. The color columns are still in the database.

Questions: none.

### 2026-10-22 — Phase 4 Delete the unused theme model

Shipped: The appearance type no longer has a theme mode, a color field, logo placement, sidebar branding, dashboard layout, or preview. Saving general settings drops those keys. `next-themes` is no longer a dependency. `scripts/check-theme-colors.mjs` freezes the current numbered palette classes, black and white palette classes, and hex colors in `src/`, `app/`, and `tests/`. Semantic tokens are not in the baseline. A new hard-coded color fails the check.

Proven: `node scripts/check-theme-colors.mjs` exited 0. `npm run check:theme-colors` is the same command. `npm run typecheck:src` passed. ESLint passed on the files this phase changed. The company save payload test still passes and now expects the dropped appearance keys to be absent.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Settings, then General.
2. The theme switch should still be FlowForce, Light, and Dark. There should still be no color picker.
3. Save a company name change. Reload. The name should stick, and the theme choice in this browser should stick.

Blockers: none. No migration.

Questions: none.
