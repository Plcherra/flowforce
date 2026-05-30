# 08 Mobile App And Offline Mode

## Goal

Make FlowForce work as a real mobile product for managers and staff, starting with the lowest-risk app-store path and growing toward native/offline workflows where the product needs them.

## Phases

### Phase 1: Mobile Strategy Decision

- [x] Choose Capacitor-first or Expo-first for v1 mobile.
- [x] Define what "mobile app" must do for pilot customers.
- [x] Define app store requirements.
- [x] Define what remains web-only.

Acceptance:

- Mobile work has a clear technical path.

Verification:

- Strategy doc is linked from master roadmap.

Status:

- Completed on 2026-05-29.
- Decision: Capacitor-first for v1, with the current Next.js PWA/mobile web app as the source product.
- Strategy: [Mobile Strategy Decision](../mobile-strategy-decision.md)
- Contract: `src/services/mobile/mobileStrategy.ts`
- Phase report: [08.01 Mobile Strategy Decision](./reports/08-01-mobile-strategy-decision-2026-05-29.md)

### Phase 2: Responsive Web QA Baseline

- [x] Audit core modules on mobile viewport.
- [x] Fix navigation, safe areas, sticky elements, modals, tables, forms, and text overflow.
- [x] Add screenshots or smoke checks.
- [x] Document remaining mobile UX debt.

Acceptance:

- Current PWA is usable before wrapping it.

Verification:

- Mobile viewport smoke passes for pilot modules.

Status:

- Completed on 2026-05-29.
- Baseline: [Mobile Responsive QA Baseline](../mobile-responsive-qa-baseline.md)
- Contract: `src/services/mobile/mobileResponsiveBaseline.ts`
- Smoke runner: `scripts/smoke-visible-modules.mjs`
- Phase report: [08.02 Responsive Web QA Baseline](./reports/08-02-responsive-web-qa-baseline-2026-05-29.md)

### Phase 3: Capacitor Shell

- [x] Restore/add active Capacitor config.
- [x] Add iOS and Android projects.
- [x] Configure app name, bundle IDs, icons, splash, and allowed origins.
- [x] Verify local build/run.

Acceptance:

- The current Next app can run in a native shell.

Verification:

- iOS/Android projects build locally or documented blocker exists.

Status:

- Completed on 2026-05-29.
- Native shell: [Mobile Capacitor Shell](../mobile-capacitor-shell.md)
- Config: `capacitor.config.ts`
- Service: `src/services/mobile/mobileCapacitorShell.ts`
- Checker: `npm run check:mobile-capacitor`
- Phase report: [08.03 Capacitor Shell](./reports/08-03-capacitor-shell-2026-05-29.md)

### Phase 4: Auth And Routing In App Shell

- [x] Verify login, signup, onboarding, session restore, and logout.
- [x] Fix deep links and redirect URLs.
- [x] Handle app resume/refresh.
- [x] Add app-shell-specific error states.

Acceptance:

- Mobile users can authenticate reliably.

Verification:

- Auth QA script passes on mobile shell.

Status:

- Completed on 2026-05-29 for the current Next.js PWA/mobile web app shell.
- Native iOS/Android device verification can now run against the Phase 08.03 Capacitor shell once `CAPACITOR_SERVER_URL` and simulator/device tooling are configured.
- Contract: [Mobile Auth And Routing App Shell](../mobile-auth-routing-app-shell.md)
- Service: `src/services/mobile/mobileAuthRouting.ts`
- Checker: `npm run check:mobile-auth-routing`
- Phase report: [08.04 Auth And Routing In App Shell](./reports/08-04-auth-and-routing-app-shell-2026-05-29.md)

### Phase 5: Mobile Core Workflows

- [x] Verify dashboard, schedule, tasks, messages, forms, inventory counts, and settings.
- [x] Fix touch targets and mobile forms.
- [x] Simplify staff workflows.
- [x] Add manager quick actions.

Acceptance:

- A field user can do daily work from the app.

Verification:

- Manual/mobile smoke checklist passes.

Status:

- Completed on 2026-05-30.
- Contract: [Mobile Core Workflows](../mobile-core-workflows.md)
- Service: `src/services/mobile/mobileCoreWorkflows.ts`
- Dashboard actions: `src/features/dashboard/components/MobileCoreWorkflowActions.tsx`
- Checker: `npm run check:mobile-core-workflows`
- Phase report: [08.05 Mobile Core Workflows](./reports/08-05-mobile-core-workflows-2026-05-30.md)

### Phase 6: Push Notifications

- [x] Choose notification provider.
- [x] Store device tokens safely.
- [x] Add notification preferences.
- [x] Send notifications for tasks, schedule changes, messages, approvals, low stock, and overdue workflows.

Acceptance:

- Mobile app can bring users back to urgent work.

Verification:

- Test notification opens the correct route.

Status:

- Completed on 2026-05-30.
- Contract: [Mobile Push Notifications](../mobile-push-notifications.md)
- Service: `src/services/mobile/mobilePushNotifications.ts`
- Runtime hook: `src/hooks/useMobilePushNotifications.ts`
- Migration: `supabase/migrations/20260530000100_phase8_mobile_push_notifications.sql`
- Checker: `npm run check:mobile-push-notifications`
- Phase report: [08.06 Push Notifications](./reports/08-06-push-notifications-2026-05-30.md)

### Phase 7: Offline Queue Foundation

- [x] Define offline-capable entities.
- [x] Add mutation queue.
- [x] Add retry, conflict, and failed-sync UI.
- [x] Start with tasks/forms/counts.

Acceptance:

- Weak connectivity does not destroy field work.

Verification:

- Offline create/update syncs after reconnect.

Status:

- Completed on 2026-05-30.
- Contract: [Mobile Offline Queue Foundation](../mobile-offline-queue-foundation.md)
- Service: `src/services/mobile/mobileOfflineQueue.ts`
- Mobile UI: `src/app-shell/mobile/MobileOfflineQueueStatus.tsx`
- Checker: `npm run check:mobile-offline-queue`
- Phase report: [08.07 Offline Queue Foundation](./reports/08-07-offline-queue-foundation-2026-05-30.md)

### Phase 8: Offline Inventory Counts And Forms

- [x] Make counts usable offline.
- [x] Make checklist/form runs usable offline.
- [x] Store evidence safely.
- [x] Sync with review status.

Acceptance:

- The highest-value field workflows work offline.

Verification:

- Offline count and form QA passes.

Status:

- Completed on 2026-05-30.
- Contract: [Mobile Offline Critical Workflows](../mobile-offline-critical-workflows.md)
- Service: `src/services/mobile/mobileOfflineCriticalWorkflows.ts`
- Checker: `npm run check:mobile-offline-critical-workflows`
- Phase report: [08.08 Offline Inventory Counts And Forms](./reports/08-08-offline-inventory-counts-and-forms-2026-05-30.md)

### Phase 9: App Store Readiness

- [x] Add privacy policy and permissions explanations.
- [x] Add screenshots and metadata.
- [x] Add build profiles.
- [x] Add TestFlight/internal testing flow.

Acceptance:

- Repo-side mobile store packet is ready for review.

Verification:

- Store checklist is complete.

Status:

- Completed on 2026-05-30.
- Contract: [Mobile App Store Readiness](../mobile-app-store-readiness.md)
- Store packet: `store/mobile/`
- Service: `src/services/mobile/mobileAppStoreReadiness.ts`
- Checker: `npm run check:mobile-app-store-readiness`
- Phase report: [08.09 App Store Readiness](./reports/08-09-app-store-readiness-2026-05-30.md)
- External submission prerequisites remain outside the repo: final simulator/device screenshots, legal approval of privacy/terms, Apple signing, and Android upload signing.

### Phase 10: Native Future Evaluation

- [x] Decide whether Capacitor is enough.
- [x] If needed, plan Expo/native screens for field-heavy workflows.
- [x] Define shared contracts for native app.
- [x] Update roadmap status.

Acceptance:

- Mobile strategy evolves from real usage, not guesses.

Verification:

- Native rebuild is only started if justified.

Status:

- Completed on 2026-05-30.
- Decision: Capacitor remains the v1 app-store path; native rewrite is deferred until pilot evidence proves a blocker.
- Contract: [Mobile Native Future Evaluation](../mobile-native-future-evaluation.md)
- Service: `src/services/mobile/mobileNativeFutureEvaluation.ts`
- Checker: `npm run check:mobile-native-future`
- Phase report: [08.10 Native Future Evaluation](./reports/08-10-native-future-evaluation-2026-05-30.md)

## Closeout Review

Plan 8 is complete from the repository side. FlowForce has a mobile-responsive Next.js app, an active Capacitor iOS/Android shell, mobile auth/routing contracts, core field workflows, native push routing, offline queue protection, offline forms/counts protection, app-store readiness artifacts, and a native-future decision.

Before public app-store submission, these external/manual gates still need to happen outside the repository:

- Capture final iOS and Android screenshots from simulator or device builds.
- Complete legal review of privacy policy and terms.
- Configure Apple signing/provisioning with the company Apple Developer account.
- Configure Android upload signing with the company Google Play account.
- Run real-device or simulator QA with `CAPACITOR_SERVER_URL` pointed at the deployed app.

Native rebuild guidance remains unchanged: do not start Expo, React Native, Flutter, or a broader native rewrite unless internal testing or paid-pilot usage proves one of the native triggers documented in [Mobile Native Future Evaluation](../mobile-native-future-evaluation.md).
