# 11 Access Classes And Invite

Date: 2026-09-16

Status: Complete. Phases 1–6 are in the product. Closed on 2026-09-17. This file is the owner-facing access model we agreed after comparing Connecteam and Jolt. It does not replace Phase 10 launch work.

## Goal

An owner can plant starter classes on day one, open and edit them if they want, change them later on the same account, and invite people by class. The class paints the boxes. The inviter give/takes a few. No new company. No blank 80-box setup. No 14-column HR spreadsheet as the home invite.

## Matching State

1. **Level** is locked by FlowForce: Owner, Admin, Manager, Staff. This is the safety ceiling (billing, tenant isolation, who can grant what).
2. **Class** is owned by the company: “Manager”, “Kitchen manager”, “FOH”, “Closer”. A class sits on a level. The owner names it and ticks See / Edit / Create-delete on each job.
3. Onboarding plants the four system roles only: Owner, Admin, Manager, Staff. Create class starts from Admin, Manager, or Staff. No extra packs. Always show **Open roles**. Small shops are not forced to design access.
4. Later, Team → Roles is the same editor. No new account.
5. Invite: pick a class → boxes paint → give/take for this person → send. **+ Add another** as cards. CSV only when they have a list.
6. User card uses the same boxes. Change class and the boxes reset to that class, then tweak again.
7. Repair / support / product-role seed may create missing levels. They must not overwrite owner-edited class boxes.

## Decision: Do Not Put All Permissions Only On `user_id`

Attaching every permission to the person does **not** solve the overwrite bug. We already store exceptions on `user_permissions` (`user_id` + key + allow/deny). That is the right place for “Jordan cannot approve time off.”

If we made the person the only source of truth:

- Changing “all managers can do counts” means editing every manager.
- The next Manager invite has no class to copy.
- Repair can still reset the class used at invite time, so new people come back wrong.
- We lose the Connecteam-style class we just agreed to.

**Keep both layers:**

| Layer | Table | What it stores | Example |
|---|---|---|---|
| Class default | `company_roles.permissions` | The pack for that class | Manager can approve time off |
| Person exception | `user_permissions` | Only give/take diffs | Jordan, Manager, cannot approve time off |

**The actual fix for overwrite:** `ensureProductCompanyRoles` (and repair / support) must insert missing Owner / Admin / Manager / Staff **rows**. It must not write over permissions, name, or boxes the owner already changed. Seed if missing. Never clobber.

Effective access for a person = class boxes + that person’s diffs, and never above their class level.

## Operator Areas (Not The Raw Catalog)

Owners see one row per job, with See / Edit / Create-delete. The class is the standard. A person later gets the same grid as give/take. Registry keys stay under the hood.

Rows:

- Profile
- My schedule
- Team schedule
- My tasks
- Run lists
- Expenses
- Time off
- Inventory
- Reports
- AI
- Team
- Settings

Every row is visible. A cell is either grantable or a dash. Nothing sits in a hidden key list. A Staff-level class can take See on team schedule, run lists, and team. It cannot take Edit, Create/delete, settings, or billing. An inviter can only give cells they themselves hold.

## Examples: Agreed vs Today

### 1. Plant templates, optional Open roles

**Agreed.** Maria opens a 12-person cafe. Setup plants Owner / Admin / Manager / Staff and shows **Open roles** + Continue. She can skip. She can open one card and uncheck Time off edit on Manager. She is not asked to invent four roles or add Positions.

**Today.** Setup plants Owner / Admin / Manager / Staff and shows **Open roles** + Continue. Positions are off this step.

### 2. No extra starter packs

**Agreed.** Every tenant gets the four system roles. Create class starts from Admin, Manager, or Staff. FOH, Kitchen, Bookkeeper, and Shift lead are not hidden templates. If the owner wants those names, they create a class from a system role.

**Today.** Company size and a business template are collected. They drive sections, not classes. Every tenant gets the same Owner / Admin / Manager / Staff pack.

### 3. Job boxes, not 80 technical switches

**Agreed.** Manager card shows five or six jobs: Schedule the team, Run lists, Counts and waste, Approve time off, See reports. Maria unchecks one.

**Today.** Team → Roles uses the job-box grid: twelve operator rows (Profile through Settings), each with See / Edit / Create-delete. A cell is grantable or a dash. Raw registry keys stay under the hood. The grid is wider than “five or six jobs,” and that is honest — Settings and AI stay visible.

### 4. Invite paints boxes, then give/take

**Agreed.** Invite Jordan as Manager. Approve time off is already checked. Maria unchecks it for Jordan only. Send.

**Today.** Invite paints the class grid. Give/take stores `user_permissions` diffs. The user card uses the same grid.

### 5. Cards, then CSV

**Agreed.** Default: one person card, **+ Add another**. Large roster: paste or CSV, review name / phone / class / location / department, send.

**Today.** Stacked person cards plus **+ Add another**. Add many is CSV / paste with name, phone, class, and department. Location is off the home path. Birthday is off invite.

### 6. Location / department only when they exist

**Agreed.** One cafe: those fields stay hidden. Two locations: they appear. Birthday, hours, time-off policies, and scheduling rules stay off invite.

**Today.** Invite is stacked person cards. Department shows only when the company has more than one. Location stays hidden: `inv_locations` are inventory rooms, not restaurant sites. Birthday, hours, and policies stay off invite.

### 7. Locked level, editable class

**Agreed.** Maria adds “Kitchen manager” on the Manager level, starts from the Manager template, unchecks See reports. She cannot give that class billing. She cannot delete Owner.

**Today.** Each class has a locked `product_level`. Create class starts from Admin, Manager, or Staff. Kitchen manager cannot receive Settings or billing. Owner cannot be archived. Admin / Manager / Staff can be archived; seed will not plant a stock copy over the archived row.

### 8. Fully editable later, same account

**Agreed.** Six months later Maria opens Team → Roles, unchecks Approve time off on Manager. Every manager loses it except people she later give/takes. Repair does not put it back.

**Today.** She edits Team → Roles on the same account. Unchecking a class box deletes leftover **allow** diffs for people on that class, so everyone loses it unless she gives it back later. `ensureProductCompanyRoles`, repair, support, and plant match system rows only — a custom class named Employee is not Staff — and they do not rewrite boxes on a match.

## Current Code Anchors

- Product levels: `src/features/roles/constants/productRoleContract.json`
- Seed / overwrite: `app/api/_server/productRolesSetup.ts` (`ensureProductCompanyRoles`)
- Called from: `app/api/onboarding/complete/route.ts`, `app/api/onboarding/repair/route.ts`, `app/api/internal/support/tenant/route.ts`
- Company role CRUD: `src/hooks/useCompanyRoles.tsx`, `src/features/roles/components/RoleConfigurationTab.tsx`, `RoleManagementDialog.tsx`
- Onboarding role UI: `src/features/onboarding/components/OnboardingRoleManager.tsx`
- Person exceptions: `src/hooks/useUserPermissions.tsx`, `user_permissions` table, `UserPermissionsTab.tsx` (same Access grid as classes)
- Invite: `InvitePersonStack.tsx` on company classes, `app/api/employees/invite/route.ts` stores `role_id` + `permission_overrides`
- Grant ceiling: `src/features/roles/constants/grantCeiling.ts`
- Clamped person writes: `app/api/employees/access/route.ts`

## Build Order

### Phase 1: Stop clobbering owner classes

- [x] `ensureProductCompanyRoles` inserts missing Owner / Admin / Manager / Staff only
- [x] If a matching system row exists, do not update name, description, color, icon, or permissions
- [x] Repair / support use the same rule
- [x] Add a test: owner unchecks a Manager permission, repair runs, the uncheck survives
- [x] Keep `npm run check:roles` for the **template** contract, not live tenant rows

Acceptance: a later repair cannot restore “Approve time off” on Manager after the owner removed it.

### Phase 2: Class sits on a locked level

- [x] Each `company_roles` row has a locked `product_level` (`owner` | `admin` | `manager` | `staff`)
- [x] Class boxes cannot exceed that level
- [x] Owner class / Owner level is not deletable and is not a day-one invite target
- [x] “Start from Manager” clones the Manager template into a new class on the Manager level
- [x] Create class starts from a system role only (Admin, Manager, or Staff). No extra starter packs.

Acceptance: Kitchen manager cannot receive Settings and billing. Deleting Owner is impossible.

### Phase 3: Job-box map and class editor

- [x] Map each operator box to registry keys (one box may enable several keys)
- [x] Team → Roles shows class cards with those boxes, not the raw catalog
- [x] Advanced / raw keys stay behind the grid (review later)
- [x] No extra packs. Create only from system roles. Every grid row is visible; a cell is grantable or a dash.

Acceptance: an owner can create and edit a class from boxes in under a minute without seeing `inventory.counts.approve`.

### Phase 4: Onboarding — plant, always show Open roles

Map:

1. Plant Owner / Admin / Manager / Staff in wizard state. Size and style do not add packs.
2. Default path is glanceable class cards + **Continue**. Editing is optional.
3. **Open roles** is always visible. It uses the same Access grid as Team → Roles.
4. Positions stay off this step. They are not required to finish.
5. Edits and extra classes persist through `create_company_with_setup`. Phase 1 seed still does not clobber them.

- [x] Plant the four system roles only. Size and style do not add hidden packs.
- [x] Default path: planted classes + Continue
- [x] **Open roles** is visible for every size, including small
- [x] Open roles uses the same box editor as Team → Roles
- [x] Positions are not required to finish this step
- [x] Custom classes save through `create_company_with_setup` and are not overwritten by Phase 1 seed

Acceptance: a small cafe can skip roles. A small cafe can also open Manager and uncheck one box. Both keep those choices after complete and after repair.

### Phase 5: Invite and user card give/take

Map:

1. Default invite is stacked person cards: name, phone or email, class. Location and department only if the company has more than one.
2. Picking a class paints the Access grid. Changing class resets to that class, then keeps diffs that are still allowed on the new level.
3. Unchecked / extra cells persist as `user_permissions` allow/deny diffs, not a new class.
4. **+ Add another** stays on the same screen. **Add many** is CSV / paste review, not the home path.
5. Birthday, hours, policies, and scheduling rules stay off invite.
6. Team Directory, the employee drawer invite tab, and the user Access tab use the same company classes and the same grid.

- [x] Invite default: stacked cards — name, phone or email, class, location/department only if the company has more than one
- [x] Class change repaints boxes; inviter can check/uncheck within the class level ceiling
- [x] Diffs persist on `user_permissions` at invite send / accept / user save
- [x] **+ Add another** on the same screen
- [x] **Add many**: CSV / paste review with name, phone, class, location, department
- [x] Birthday, hours, policies, scheduling rules stay off invite
- [x] User card is the same box UI; changing class resets to class defaults, then keep existing diffs only if still allowed
- [x] Unify the two invite surfaces (`SingleInviteForm` vs `InviteEmployeePanel`) onto company classes

Acceptance: invite Jordan as Manager, uncheck Approve time off, send. Jordan cannot approve. Other managers still can. Maria can do the same later on Jordan’s card.

### Phase 6: Grant ceiling and copy

- [x] An inviter only sees boxes they can grant
- [x] Owner can let a Manager grant Staff-level boxes, not Admin / billing. Managers can invite Manager-level classes by default; Team → Roles has the toggle to restrict them to Staff only. User Access saves go through the same server clamp as invite.
- [x] Copy stays restaurant language. No “standard on.” No “auto-assigned default template.”
- [x] Do not copy Connecteam’s 14-column grid as the home invite
- [x] Do not copy Jolt’s blank permission matrix

Acceptance: a manager inviting staff cannot turn on billing. The invite screen looks like a person card, not payroll import.

## Out Of Scope

- Building roles from a blank page in onboarding
- Per-person-only permissions with no class
- Full HR fields on invite
- Changing the locked product levels without a later explicit decision
- Replacing Phase 10 deploy / backup / launch work

## Verification

- Owner edits Manager boxes → repair → boxes unchanged
- New tenant has the four system roles and a visible Open roles action
- Invite with one unchecked box writes a `user_permissions` deny (or equivalent diff)
- Staff-level class cannot persist billing / admin keys
- `npm run check:roles` still passes for the template contract
- `npm run typecheck` passes
- Manual: invite hides location until real company sites exist; department shows only when there is more than one
- Manual: Team Management and the user Access tab write `role_id` + class, not a loose `profiles.role` string
- Manual: a manager cannot persist billing on a Staff card; an owner can turn off Manager-to-Manager invites

## Close

Plan 11 is finished. The owner-facing model is in the product: locked levels, company classes, job boxes, invite + user-card give/take, grant ceiling, seed-if-missing.

Do not invent a Phase 7. The access model stays class + diffs, locked levels, no packs, no 14-column invite.

Later polish, only if asked — not blockers for this plan:

- Team Directory **Roles** (`RoleManagerDialog`) and the employee-drawer **Roles** tab (`RoleConfigPanel`) still assign a class from the browser. The Access tab, Admin Team Management, and invite already use the server clamp.
- `profiles.role` remains a level cache. `role_id` is the class identity.
- Real company sites (not inventory rooms) if location belongs on people.
