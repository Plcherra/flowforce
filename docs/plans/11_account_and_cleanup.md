# Account setup and fixed-app cleanup

FlowForce is a fixed app with packs: Operations (always on), Team, Insights, and Stock. It is no longer a multi-business custom builder.

This plan is the audit. The same pull request implements the account flow, the navigation and theme cleanup, and the role overview. Follow-ups are listed where a change would fight an in-flight pull request or a release-gate contract.

## Merge order

Merge this pull request last. Wait for the security pull request from [bc-cee1a3e3](https://cursor.com/agents/bc-cee1a3e3-bfea-51b8-8f74-29fe21136a66) to merge, then rebase onto the latest main. That main will also include packs #34, translations, and the forms and departments work. Resolve conflicts by keeping the packs plus button, the existing invite dialog, and a single lists card on Overview. Rerun Release gates, Remote deploy readiness, and the Vercel preview on the rebased branch. Merge only when those pass.

The employee invite flow from pull request #30 is unchanged. `app/api/employees/invite` and the ops invite dialog are not edited. People invited tonight keep the same account and invite path. The new signup step can call that same invite API for an optional teammate, and a failure there does not block the new company or change an existing invite.

## In flight, do not duplicate

- [bc-186fa075](https://cursor.com/agents/bc-186fa075-b1f5-5b55-aded-aa99b25678be) is still rewriting the form builder and today's role-list clocks. It is not merged. This pull request does not edit `cafeStarter`, `formDistribution`, or the form builder. Overview "My lists due" reads the published shift role lists that are already on main (`useMyShiftBoard`).
- [bc-cee1a3e3](https://cursor.com/agents/bc-cee1a3e3-bfea-51b8-8f74-29fe21136a66) is fixing authentication on the onboarding provisioning route. This pull request does not change that route's auth checks. Rebase onto main after that pull request merges, then merge this one.

## Account creation

Live route: `/company-registration`.

Order:

1. Sign up (name, email, password).
2. Company basics: name, time zone, language, optional logo. FlowForce is for coffee shops only. There is no business-type step.
3. Departments and roles. The default is "Use the coffee shop template" (FOH: Cashier and Shift lead, BOH: Cook). The owner can edit names or choose "Start from scratch". This uses the department, role, and permission model from the departments work (role overrides department).
4. Permissions for that same setup. The template is still the default when they arrive here.
5. First store and open/close hours.
6. Invite team, optional.
7. Optional starter lists. The default is "Use the coffee shop template" (opening and closing lists, which they can edit). They can choose "Start from scratch", add an unpublished shift, or skip. Restaurant and retail templates are leftovers and are not offered.
8. Overview at `/app/dashboard`.

Writes go through the existing `POST /api/onboarding/complete` after the current auth check. Departments, the store, hours, the optional shift, and the optional lists are applied in `applyAccountWorkspace`. No new table. No migration is applied. Custom section rows are left in place and ignored.

## Cleanup in this pull request

Removed from the product surface:

- The business-template picker, custom template builder, and section toggles on the live signup path.
- Custom sections in navigation, the "Add new" control, and the add-section buttons.
- `/app/add-section` and `/app/section/...` now redirect to Overview. The old rows stay in the database.
- The light/dark theme picker. The app always uses the FlowForce theme.
- Overview widgets that were the same for every role: Command center, Manager action queue, Operations snapshot, the profile card, and the activity stub.

Kept:

- Built-in navigation, gated by pack. Operations is always on. Team, Insights, and Stock stay behind their flags.
- The employee directory, which is not pack-gated.
- Logo upload in settings. If `companies.logo_url` is set, the top center header shows that image. Otherwise it shows the FlowForce wordmark.
- Prep (`/app/inventory/prep`), Cookbook (`/app/cookbook` and `/app/inventory/cookbook`), and Inventory Reports (`/app/inventory/reports`). They are on hold and get finished next week. They are not part of this cleanup.

## Overview

Everyone sees My shift today, My lists due, and Company updates.

Managers and owners also see Today's coverage (filled shifts and open shifts) and Lists overdue or completed.

Team, Insights, and Stock do not add Overview cards. A pack that is off cannot add one.

## File length

Source files under `src`, `app`, and `scripts` warn above 400 lines and fail above 500. Release Gates run `npm run check:file-length`. Tests, generated client types, and locale JSON are excluded.

Files already over 500 are in `scripts/file-length-allowlist.json`, largest first, each with a split ticket. The list can only shrink: a listed file may not grow, and a new file over 500 fails. The first split is `FF-SPLIT-01` `src/features/inventory/components/Purchasing.tsx` (1,886). Then Inventory item form (1,323), learning service (1,173), inventory transfers (1,164), and counts repository (1,138). The rest of the tickets are in the allowlist.

## Docs to realign later

Do not delete these in this pull request. Release-gate contracts still read them (`check:vps-deploy-scripts`, `check:reverse-proxy-tls`, `check:monitoring-logging`, `check:production-runtime`):

- `docs/production-vps-deploy.md` and the other VPS, Caddy, and Docker-on-a-VM docs.
- `infrastructure/caddy/Caddyfile`.
- Old multi-business roadmap files that describe custom sections and industry templates as the product.

Follow-up: archive those docs, point the contracts at Vercel deployment, and describe the packs model (Operations, Team, Insights, Stock) as the product. Production is https://www.flowforce.uk via Vercel.

## Follow-up pull requests

1. Rebase this branch after the onboarding auth pull request merges.
2. After the form-builder pull request merges, keep a single "My lists due" card if both overviews add one.
3. Delete the unused template builder and custom-section screens once nothing imports them, and update the i18n baseline in that same change.
4. Archive the VPS and multi-business docs after the release contracts no longer require them.
5. Split the allowlisted files, largest first. Each split lowers that file's ceiling. Do not add new allowlist entries.
