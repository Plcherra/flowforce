# Mobile Native Future Evaluation

Date: 2026-05-30
Roadmap phase: 08.10 Native Future Evaluation

## Decision

Capacitor remains the v1 app-store path. FlowForce should not start a broad Expo, React Native, Flutter, or native rewrite now.

The current mobile path is enough for v1 because the product now has:

- A mobile-responsive Next.js app.
- An active Capacitor iOS and Android shell.
- Mobile auth and route-restore contracts.
- Core dashboard, task, forms, inventory, settings, and manager workflows.
- Native push notification routing.
- Offline queue foundation.
- Offline protection for forms and inventory counts.
- Store metadata, permission copy, privacy draft, build profiles, and internal testing flow.

Native work should start only after internal testing or pilot usage proves a specific field-workflow blocker.

## Native Triggers

Selective Expo/React Native screens become justified if one of these triggers is met:

- Reproducible offline data loss, or more than 2 percent of offline form/count syncs requiring manual repair.
- Evidence capture cannot reliably handle camera, files, audio, video, signatures, compression, or background upload from the Capacitor shell.
- Push notification taps or deep links repeatedly fail to restore the correct workflow after app-shell fixes.
- Staff field workflows are measurably slower than the manual process they replace.
- Apple or Google requires a native behavior that cannot be solved in the wrapper.

## Native Candidates

If native work becomes justified, keep it selective:

- Inventory count execution.
- Forms, checklists, and evidence capture.
- Task and workflow field execution.

Keep admin, settings, reporting, billing, support tooling, bulk imports, and complex data cleanup in the web app for v1.

## Shared Contracts Before Native Work

Any future native screen must reuse or mirror these contracts before implementation:

- Supabase auth/session restore.
- Tenant company context.
- Role and permission registry.
- Safe `/app` route map.
- Mobile push event routes.
- Offline queue payloads.
- Form submission payloads.
- Inventory count line updates.
- Workflow review status.
- Audit event taxonomy.

## Recommendation

Ship the Capacitor v1 path through internal testing and paid-pilot usage first. Revisit selective native screens only with evidence from device QA, store review, and field workflow usage.

## Verification

08.10 is complete when:

- `npm run check:mobile-native-future` passes.
- `npm run check:mobile-app-store-readiness` passes.
- `npm run check:local` passes.
- `npm run build` passes.
