# System and Admin rework

Phases 1 and 3–7 are checked. Phase 2 is answered. Phase 8 is the Admin removal Pedro asked for on 2026-10-22. Do not start phase 8 until Theme phases 23–24 are checked.

The first half is a review list. Phase 2 records Pedro's marks. Phase 8 is the product change, and it waits until Theme phases 23–24 are checked.

The permission-grant plan is the second half. Phases 3–7 are already checked. This file is queued until Theme phases 23–24 are checked.

Settings the app actually renders live in `src/features/system/pages/SettingsPage.tsx`. The tabs are General, Security, Region, Notifications, AI, Integrations, and Billing. Phase 3 removed the Admin tab.

## Candidates

Each row is a candidate for review. Phase 2 marks candidate 6 for removal. Candidates 1–5 and 7–9 stay.

1. Settings docs still describe `src/modules/system`. `docs/cleanup-progress.md` says that folder was moved to `src/features/system`. The stale docs are `docs/system-settings-architecture.md` and `docs/system-settings-hub.md`.
2. Sidebar links in `src/data/navigationData.tsx` mix `/app/enhanced-scheduling` with bare paths such as `/tasks`, `/messages`, `/forms`, `/inventory`, `/settings`, and `/admin`. Canonical routes in `src/app-shell/navigation/moduleRouteInventory.json` are under `/app/...`. The bare paths work through redirects in `next.config.mjs`.
3. Deprecated aliases are still registered, and several still have redirects: `/app/inventory-actions`, `/app/inventory-count-execution/[[...countId]]`, `/app/items-setup`, `/app/purchasing`, `/app/cookbook`, `/app/invite-employee`, `/app/availability`, `/app/availability/manage`, `/app/schedule-lobby`, `/app/scheduling/timeoff`, and `/app/events/calendar`.
4. Time off has extra entries beside the schedule panel: hidden `/app/time-off`, the `/time-off` redirect, and deprecated `/app/scheduling/timeoff`. The live screen is Schedule.
5. These sidebar entries are marked beta, and several notes say they stay hidden for the pilot, while `sidebar` is true and `navigationData.tsx` still lists them: Analytics, AI Insights, Operations Intelligence, Calendar, Expenses, Performance, Recognition, Leaderboard, Certifications, Learning Center, Admin, and Resources.
6. Admin is both `/app/admin` and the Admin tab on Settings. The inventory note says admin work goes through Team and Settings.
7. `/app/permission-demo` is an internal demo route (`src/features/permissions/pages/PermissionDemo.tsx`), with a redirect from `/permission-demo`.
8. Operations Intelligence (`/app/operations`) is still marked beta "until Plan 06", and the master roadmap already checks that plan. The note looks stale. There is also `src/features/operations/pages/Operations.tsx` beside `OperationsIntelligence.tsx`.
9. Company color fields are still saved from General settings (`companies.primary_color`, `companies.secondary_color`). The later theme file owns that work. Do not start it from this review.

## Phases

Phase 2 is answered. Do not change product code until phase 8. Candidates 1–5 and 7–9 stay.

### Phase 1 — Candidate list

- [x] Record the systems above as review candidates.

Rules:

- Files: this file only.
- Do not edit application code, migrations, or navigation.

Done when:

- The nine candidates are listed with the file or route that shows the problem.

Prove: This file is the list. No product code changes in the commit that added it.

### Phase 2 — Owner marks keep or drop

- [x] Record what Pedro wants removed.

Pedro, 2026-10-22:

- Delete the Admin page entirely. App settings already live under the profile card in the header. Leave them there.
- Move everything that is on Admin into the team directory. Each person sees only what their permissions allow: their own team, the whole store, vendors, invitations, and the rest of those tools.
- Reports inside Admin duplicate the Reports section. Remove the Admin copies.
- The Reports section needs a new name so it is not a second Reports. Proposed name: Insights. Use Insights for the section title and the bottom-nav short label.
- Remove the ADMIN group from the bottom nav.

Candidates 1–5 and 7–9 were not marked drop. They stay.

Prove: This file records the marks. No product code in the commit that answered the question.

## Open questions

None. "Which candidates to remove" is answered above.

## Progress log

### 2026-10-22 — Candidate list

Shipped: the nine candidates in this file. No product code.

Proven: the list is the proof. Nothing was deleted or rewired.

Blockers: Phase 2 is blocked until the owner marks which candidates to remove.

Questions: Which candidates to remove?

### 2026-10-22 — Phase 2 Owner marks keep or drop

Skipped. Blocked by Open question "Which candidates to remove". No product code. No candidate was marked keep or drop.

Questions: Which candidates to remove?

## Permission grant plan

Phases 3–7 are checked. Phase 2 is answered. Phase 8 waits for the theme rework.

Permissions stay in `src/features/roles` and `src/lib/permissions/registry.ts`. Do not add a second matrix. Levels stay the packs in `src/features/roles/constants/productRoleContract.json`: staff is level 1, manager is level 2, admin is level 3, and owner is level 4.

### Decisions

These are locked when this file is the active feature. Implement them. Do not edit this section while implementing one of these phases.

1. Remove the Admin tab and the Admin page as the way access is granted. Settings drops the Admin tab (`SettingsPage` key `admin`, `AdminSettingsPanel`). The sidebar Admin item (`/admin` in `src/data/navigationData.tsx`, `src/features/admin/pages/Admin.tsx`) is not an access model. Controls that still have a job move to the Settings tab whose permission already covers them: billing plan and billing stay on Billing (`billing.manage`), and settings export, audit, and danger actions stay behind `systemSettings`. User management stays behind `manageUsers` on the employee directory. Do not leave a page whose purpose is "you are an admin". Do not delete the registry keys.
2. A permission shows only the access types it needs, chosen from read, create, edit, and delete. A permission that only needs read does not also show create, edit, and delete. Read uses the existing `.view` key when the registry already has one (`directory.view`, `inventory.view`). Grant is not a fifth page type. Grant is the separate right to give that permission to someone else. Existing keys such as `approveTimeOff` stay. On the grant screen, approving time off is the edit type for that permission. Do not delete the key, and do not add an access type named approve, export, manage, or suggest.
3. Levels are default packs, not gates. `directory.view` stays on by default for level 2 (manager) and level 3 (admin), and off by default for level 1 (staff). Owner keeps full access. `isLeadershipLevel` is not why a page is hidden. The employee directory (`src/features/employees/pages/Employees.tsx` and `src/hooks/useNavigationStructure.tsx`) shows when `directory.view` resolves on, including for a level 1 user who was granted it. A level 2 user with that permission denied does not see it. An owner, or anyone who has the grant right for a permission, can grant that permission to any user, including level 1, and can grant that user the right to grant it. Store the change as an allow or deny override on `user_permissions`, the same way Team hours stores schedule grants.
4. A page renders the version the person's permissions allow. It does not render a version from the level number. Schedule: the whole team when `viewTeamSchedules` and `schedule.view` are on; draft only when `editSchedules` is on and `schedule.create`, `schedule.edit`, and `schedule.delete` are off; create, edit, and delete only for the keys that are on. One of those actions does not turn the others on. The same rule covers inventory (`inventory.view`, `inventory.create`, `inventory.edit`, `inventory.delete`), recognition (`src/features/recognition/pages/Recognition/RecognitionPage.tsx`), team leadership (the directory and the leadership schedule tools), onboarding (`src/features/onboarding`), and certifications (`src/features/learning/pages/Certifications/CertificationsPage.tsx`). Add a key to the existing registry only when that area has no key for an action the page already has. A page with no create control does not get a create key. New keys default on for level 2 and level 3, off for level 1, and on for the owner.
5. The main button follows the edit permission for that action. Someone with edit sees Save changes, and the button writes directly. Someone without edit sees Send request. My Availability does not use this pair. Time Off decision 3 uses one Send availability button, because availability changes need no approval. That screen is specified in [docs/features/time-off.md](time-off.md). Do not relabel it from this plan.

### Phase 3 — Admin is not an access model

- [x] Remove the Admin tab and the Admin page as the way access is granted.

Rules:

- Files: `src/features/system/pages/SettingsPage.tsx`, `src/data/navigationData.tsx`, `src/features/admin/pages/Admin.tsx`, and a new `src/features/system/utils/settingsTabs.ts` with `src/features/system/utils/settingsTabs.test.ts`.
- Follow Decision 1. Do not add a permission key.
- This phase waits until this file is the active feature.

Done when:

- Settings has no Admin tab.
- The sidebar has no Admin item.
- Billing plan stays on Billing. Settings export and danger actions stay behind `systemSettings`. User management stays behind `manageUsers`.

Prove: `src/features/system/utils/settingsTabs.test.ts` asserts the settings tab keys do not include `admin`, and the navigation items do not include an Admin href of `/admin`. Run it with `node scripts/test-product-roles-setup.mjs` and add the file to that runner.

### Phase 4 — Access types are only what the permission needs

- [x] Show read, create, edit, and delete only when that permission needs them.

Rules:

- Files: `src/features/roles/constants/permissionAccessTypes.ts` and `src/features/roles/constants/permissionAccessTypes.test.ts`.
- Follow Decision 2. Do not add a second permission list.
- This phase waits until this file is the active feature.

Done when:

- Every switch type is read, create, edit, delete, or the separate grant right.
- A read-only permission has no create, edit, or delete switch.
- `approveTimeOff` still exists, and its grant-screen type is edit.

Prove: Extend `permissionAccessTypes.test.ts` so a switch outside read, create, edit, delete, and grant fails, a read-only row has no create, edit, or delete switch, and time off approval maps to edit. Run `node scripts/test-product-roles-setup.mjs`.

### Phase 5 — Levels are default packs

- [x] Let a grant turn a permission on for any user, including level 1, and let that grant include the right to grant it.

Rules:

- Files: `src/features/roles/constants/productRoleContract.json`, `src/features/employees/pages/Employees.tsx`, `src/hooks/useNavigationStructure.tsx`, and a new `src/features/roles/constants/permissionGrant.test.ts`.
- Follow Decision 3. Do not add a second matrix.
- This phase waits until this file is the active feature.

Done when:

- Level 2 and level 3 include `directory.view` by default. Level 1 does not.
- A level 1 user with an allow override for `directory.view` sees the employee directory.
- A level 2 user with that permission denied does not.
- An owner, or a user with the grant right, can grant the permission and can grant the right to grant it.

Prove: `src/features/roles/constants/permissionGrant.test.ts` covers the level 2 and level 3 default, the level 1 default off, an allow override for level 1, a deny override for level 2, and a grant right that can grant `directory.view`. Add the file to `scripts/test-product-roles-setup.mjs` and run it. Also run `npm run check:roles`.

### Phase 6 — Pages render the permitted version

- [x] Render schedule, inventory, recognition, team leadership, onboarding, and certifications from permissions.

Rules:

- Files: a new `src/features/roles/constants/pageVersion.ts` with `src/features/roles/constants/pageVersion.test.ts`. Add missing keys only in `src/lib/permissions/registry.ts` and `src/features/roles/constants/productRoleContract.json`.
- Follow Decision 4. Do not branch these pages on `isLeadershipLevel`.
- This phase waits until this file is the active feature.

Done when:

- Schedule can be the whole team, draft only, or create, edit, and delete, and one action does not turn the others on.
- Inventory, recognition, team leadership, onboarding, and certifications show only the actions whose keys are on.
- A level number alone does not choose the version.

Prove: `src/features/roles/constants/pageVersion.test.ts` returns team, draft, and create/edit/delete for the schedule keys in Decision 4. One create key does not turn on edit or delete. The same helper ignores hierarchy level for inventory, recognition, team leadership, onboarding, and certifications. Add the file to `scripts/test-product-roles-setup.mjs` and run it. Also run `npm run check:roles`.

### Phase 7 — Save changes or Send request

- [x] Label the main button from the edit permission.

Rules:

- Files: a new `src/features/roles/constants/primaryActionLabel.ts` with `src/features/roles/constants/primaryActionLabel.test.ts`.
- Follow Decision 5.
- Edit on: label Save changes, and the button writes directly. Edit off: label Send request.
- Do not use this pair on My Availability. That screen stays Send availability, specified in `docs/features/time-off.md`.
- This phase waits until this file is the active feature.

Done when:

- A person with edit sees Save changes.
- A person without edit sees Send request.
- My Availability is unchanged by this phase.

Prove: `src/features/roles/constants/primaryActionLabel.test.ts` returns Save changes when edit is on and Send request when edit is off. It does not return Send availability. Add the file to `scripts/test-product-roles-setup.mjs` and run it.

### Phase 8 — Delete Admin and fold it into the directory

- [x] Remove the Admin page, the ADMIN bottom-nav group, and the duplicate reports.

Rules:

- Depends on Theme phases 23–24. Do not start this phase while those are unchecked.
- Follow the Phase 2 marks. Do not add a permission list.
- Delete the Admin page. Settings stay on the profile card in the header.
- Move the remaining Admin tools into the team directory. A person sees own team, the whole store, vendors, or invitations only when the permission they already have allows it.
- Remove report blocks that repeat the Reports section.
- Rename that section to Insights, including the bottom-nav short label that is Admin's neighbor today.
- Remove the ADMIN group from the bottom nav. Do not leave an Admin item or an Administration group.

Done when:

- There is no Admin page and no ADMIN group in the bottom nav.
- Directory screens show only the tools the person's permissions allow.
- The old Reports section is labeled Insights, and Admin no longer has a copy of it.

Prove: Extend the navigation test so the bottom nav has no ADMIN group and no `/admin` href, and the reports group label is Insights. Run it with the existing navigation test runner.

## Permission plan progress

### 2026-10-22 — Permission grant plan

Shipped: this plan only. No product code. Decisions 1–5 and phases 3–7 are unchecked. Decision 5 is the button pair: Save changes with edit, Send request without it. My Availability is the exception in Time Off decision 3.

Proven: this file is the plan.

Blockers: these phases wait until this file is marked active. Candidate phase 2 stays blocked on which candidates to remove.

Questions: Which candidates to remove? No new question.

### 2026-10-22 — Phase 3 Admin is not an access model

Shipped: Settings no longer has an Admin tab. The sidebar no longer has an Admin item. Billing plan and billing stay on the Billing tab, and the plan editor stays behind `billing.manage`. Settings export, audit, and danger actions stay on General behind `systemSettings`. User management stays on the employee directory behind `manageUsers`. `/app/admin` opens the employee directory instead of an access page. No new permission key.

Proven: `src/features/system/utils/settingsTabs.test.ts` passed through `node scripts/test-product-roles-setup.mjs`. The settings tab keys do not include `admin`. The navigation items do not include an Admin href of `/admin`. Billing stays on the billing tab behind `billing.manage`. Export, audit, and danger stay behind `systemSettings`. User management stays behind `manageUsers` on the employee directory. `npm run check:i18n` printed 4625 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on the TypeScript files this phase changed. No new locale strings.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Settings. The tabs are General, Security, Region, Notifications, AI, Integrations, and Billing. There is no Admin tab.
2. In the sidebar, Administration shows Settings and Resources. There is no Admin item.
3. Open Billing. The plan, seats, and billing actions are on that tab. With billing manage, the plan editor, seats, and workspace access are on Billing too.
4. Open General as an owner or someone with system settings. Export backup, the high-risk confirmation, and recent audit activity are on General. Sign in as a manager without system settings. Those blocks are hidden.
5. Open the team directory and open a person. Access and Roles & Permissions show only for someone with manage users. Open `/app/admin`. It leaves that address and opens the employee directory.

Blockers: Phase 2 stays skipped. Open question "Which candidates to remove" is still unanswered. No migration.

Questions: Which candidates to remove? No new question.

### 2026-10-22 — Phase 4 Access types are only what the permission needs

Shipped: Each grant-screen switch is read, create, edit, delete, or the separate grant right. A read-only row, including own schedule and inventory export, has no create, edit, or delete switch. `approveTimeOff` still exists, and its grant-screen type is edit. Approve, export, manage, suggest, assign, and automate are no longer switch types. Count approval and reports export are their own rows so one switch does not turn the other permission on. Count approval and reports export are translated in all six locales.

Proven: `src/features/roles/constants/permissionAccessTypes.test.ts` passed through `node scripts/test-product-roles-setup.mjs`. A switch outside read, create, edit, delete, and grant fails. A read-only row has no create, edit, or delete switch. Time off approval maps to edit, and `approveTimeOff` is still a registry key. `npm run check:i18n` printed 4627 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on the TypeScript files this phase changed.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk as an owner. Open the team directory, open a person, and open Access.
2. Time off shows Edit. It does not show Approve. Turning Edit off is the time-off approval permission.
3. Own schedule and inventory export show Read only. They do not show Create, Edit, or Delete.
4. Reports shows Read for viewing. Reports export is its own row and its switch is Read. Count approval is its own row and its switch is Edit.
5. Switch labels on that screen are Read, Create, Edit, Delete, or Grant. There is no Approve, Export, Manage, or Suggest switch.

Blockers: Phase 2 stays skipped. Open question "Which candidates to remove" is still unanswered. No migration.

Questions: Which candidates to remove? No new question.

### 2026-10-22 — Phase 5 Levels are default packs

Shipped: Level 2 and level 3 already include `directory.view` by default, and level 1 does not. The employee directory and its sidebar item now follow that permission, including an allow override for level 1 and a deny override for level 2. The level number does not hide the page. An owner, or a person who holds the directory grant right `directory.view.grant`, can grant `directory.view` and can pass that grant right on. Holding `directory.view` alone does not grant it. No new registry key.

Proven: `src/features/roles/constants/permissionGrant.test.ts` passed through `node scripts/test-product-roles-setup.mjs`. Level 2 and level 3 default on. Level 1 defaults off even when the hierarchy number is 4. A level 1 allow override sees the directory. A level 2 deny override does not, even when the hierarchy number is 4. An owner grant turns the directory on for level 1 and includes the grant right, and that person can grant it onward. A manager without the grant right cannot. `npm run check:roles` passed. `npm run check:i18n` printed 4628 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on the TypeScript files this phase changed.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk as a manager. The team directory is in the sidebar and the page opens.
2. Sign in as staff. The team directory is hidden, and opening the employee page says directory access is off for this account.
3. As an owner, grant that staff person directory view. Reload as that person. The directory is in the sidebar and the page opens.
4. As an owner, deny directory view for a manager. Reload as that manager. The directory is hidden.
5. As an owner, grant the directory and the grant right to a staff person. That person can pass directory view and the grant right to someone else. A manager who can see the directory, but was not given the grant right, cannot pass it on.

Blockers: Phase 2 stays skipped. Open question "Which candidates to remove" is still unanswered. No migration. The grant right is the override key `directory.view.grant` on `user_permissions`. It is not a new registry key.

Questions: Which candidates to remove? No new question.

### 2026-10-22 — Phase 6 Pages render the permitted version

Shipped: Schedule, inventory, recognition, team leadership, onboarding, and certifications take their version from permission keys. The hierarchy number is ignored. Schedule is the whole team when `viewTeamSchedules` and `schedule.view` are both on, draft only when `editSchedules` is on and create, edit, and delete are off, and create, edit, and delete follow only their own keys. Inventory uses `inventory.view`, `inventory.create`, `inventory.edit`, and `inventory.delete`. Recognition sync uses the new `recognition.edit` key. Onboarding create and delete use the new `onboarding.create` and `onboarding.delete` keys, and onboarding edit uses `managePositions`. Certifications has no create control, so it has no create key. Team leadership read is `directory.view`, create is `manageUsers`, and edit is `directory.manage`. New keys default on for level 2 and level 3, off for level 1, and on for the owner. The schedule screen uses this version instead of `isLeadershipLevel`. Recognition shows Sync automation only when `recognition.edit` is on.

Proven: `src/features/roles/constants/pageVersion.test.ts` passed through `node scripts/test-product-roles-setup.mjs`. Team, draft, and create/edit/delete follow the schedule keys. One create key does not turn on edit or delete. Inventory, recognition, team leadership, onboarding, and certifications return the same version at hierarchy 1 and hierarchy 4. `npm run check:roles` passed with 74 registered permissions. `npm run check:i18n` printed 4628 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on the TypeScript files this phase changed.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk as a manager. Open Schedule. The team grid is available, and create and edit are available. Delete is not, because that key is off for a manager.
2. Sign in as staff with no schedule grants. The team grid and draft tools stay off.
3. As an owner, grant that staff person only `editSchedules`. Reload as that person. Draft tools are on. Create, edit, and delete stay off.
4. Grant only `schedule.create`. Create is on. Edit and delete stay off, and draft-only mode is off.
5. Open Recognition as staff. Sync automation is hidden. Open it as a manager. Sync automation is shown. Certifications still has refresh only.

Blockers: Phase 2 stays skipped. Open question "Which candidates to remove" is still unanswered. No migration.

Questions: Which candidates to remove? No new question.

### 2026-10-22 — Phase 7 Save changes or Send request

Shipped: The main-button pair is Save changes when edit is on, and that action writes directly. It is Send request when edit is off, and that action does not write directly. The helper does not return Send availability. My Availability was not relabeled.

Proven: `src/features/roles/constants/primaryActionLabel.test.ts` passed through `node scripts/test-product-roles-setup.mjs`. Edit on returns Save changes and writes directly. Edit off returns Send request and does not write directly. Neither result is Send availability. `npm run check:i18n` printed 4630 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on the TypeScript files this phase changed.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open My Availability. The button still says Send availability. It does not say Save changes or Send request.
2. The edit pair is Save changes when the edit permission is on, and that button writes directly.
3. The edit pair is Send request when the edit permission is off.
4. This phase does not put that pair on My Availability.

Blockers: Phase 2 stays skipped. Open question "Which candidates to remove" is still unanswered. No migration. Phases 3–7 are checked. This file stays active because phase 2 is still unchecked.

Questions: Which candidates to remove? No new question.

### 2026-10-22 — Phase 2 answered

Shipped: Pedro's marks, in this file only. Delete the Admin page. Settings stay under the profile card in the header. Admin tools move into the team directory, and each person sees only what their permissions allow. Admin's report copies go away. The Reports section is proposed as Insights. The ADMIN group leaves the bottom nav. Phase 8 is that work, and it waits for Theme phases 23–24. Candidates 1–5 and 7–9 were not marked drop.

Proven: this file is the record. No product code.

Blockers: none for the decision. Phase 8 does not start during the theme rework.

Questions: none.

### 2026-10-23 — Phase 8 Delete Admin and fold it into the directory

Shipped: The Admin page is gone. `/admin` and `/app/admin` open the team directory. Settings stay on the profile card in the header, and the Settings link now sits with the team items instead of an Administration group. Resources stays in that team group, and its label is Resources, so it is no longer a second Reports link. The old Reports section is labeled Insights, including the bottom-nav short label. There is no ADMIN group and no Admin item. Directory tools follow the permissions a person already has: the whole store needs `directory.view`, vendors need `inventory.view`, adding a vendor needs `inventory.create`, invitations need `manageUsers`, roles need `admin.roles` or `directory.manage`, and the permissions button needs `admin.permissions`. The old Admin insight panel is not mounted on the directory, so Admin has no copy of the reports section. No new permission key.

Proven: `src/app-shell/navigation/bottomNav/bottomNavDestinations.test.ts` and `src/features/employees/utils/directoryTools.test.ts` passed through `node scripts/test-bottom-nav.mjs`. The bottom nav groups are Ops, Inventory, Insights, and Team. There is no ADMIN group, no Administration section, and no `/admin` href. A reports permission does not turn on a directory tool.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk. Open the bottom nav on a wide screen, or More on a phone. There should be no ADMIN group and no Admin item. The group that used to say Reports should say Insights.
2. Open the profile card in the header. Settings is still there.
3. Open the team directory as an owner. Invitations, roles, and permissions are available. Vendors is available.
4. Open the team directory as a manager. The whole store roster is there, and vendors are there. Invite, roles, and the permissions button stay hidden unless those permissions were granted.
5. Open `/app/admin`. It should leave that address and open the team directory. There should be no Admin page and no second reports list on that screen.

Blockers: none. No migration. Theme phases 23–24 are checked. This was the last unchecked phase in this file.

Questions: none.

### 2026-10-23 — Settings stay on the profile card

Shipped: The Settings entry is gone from the team directory navigation and from the Team group in the bottom nav, including More. The team directory stays people-related: roster, invitations, roles, permissions, and vendors, each behind the permission it already uses. The header profile card still opens `/app/settings`. That page is the same Settings screen the team entry opened, so no setting had to move. `/settings`, `/settings/:path*`, `/admin/settings`, and `/app/admin/settings` still open that page. `/admin` and `/app/admin` still open the team directory.

Proven: `src/app-shell/navigation/bottomNav/bottomNavDestinations.test.ts` and `src/features/employees/utils/directoryTools.test.ts` passed through `node scripts/test-bottom-nav.mjs`. The Team group has no Settings item. `src/features/system/utils/settingsTabs.test.ts` passed through `node scripts/test-product-roles-setup.mjs`. The profile card navigates to `/app/settings`, the team directory source has no settings tab, and the old settings redirects land on `/app/settings`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk. Open the profile card in the header. Settings opens General, Security, Region, Notifications, AI, Integrations, and Billing.
2. Open the Team group in the bottom nav, and More on a phone. There is no Settings icon. The team directory still has the roster, and invitations, roles, permissions, and vendors follow the permissions you already have.
3. Open `/settings` and `/admin/settings`. Both open the same Settings page as the profile card. Open `/app/admin`. That still opens the team directory.

Blockers: none. No migration. No setting lived only on the team-directory link.

Questions: none.
