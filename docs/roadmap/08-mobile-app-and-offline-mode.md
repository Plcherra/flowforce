# 08 Mobile App And Offline Mode

## Goal

Make FlowForce work as a real mobile product for managers and staff, starting with the lowest-risk app-store path and growing toward native/offline workflows where the product needs them.

## Phases

### Phase 1: Mobile Strategy Decision

- [ ] Choose Capacitor-first or Expo-first for v1 mobile.
- [ ] Define what "mobile app" must do for pilot customers.
- [ ] Define app store requirements.
- [ ] Define what remains web-only.

Acceptance:

- Mobile work has a clear technical path.

Verification:

- Strategy doc is linked from master roadmap.

### Phase 2: Responsive Web QA Baseline

- [ ] Audit core modules on mobile viewport.
- [ ] Fix navigation, safe areas, sticky elements, modals, tables, forms, and text overflow.
- [ ] Add screenshots or smoke checks.
- [ ] Document remaining mobile UX debt.

Acceptance:

- Current PWA is usable before wrapping it.

Verification:

- Mobile viewport smoke passes for pilot modules.

### Phase 3: Capacitor Shell

- [ ] Restore/add active Capacitor config.
- [ ] Add iOS and Android projects.
- [ ] Configure app name, bundle IDs, icons, splash, and allowed origins.
- [ ] Verify local build/run.

Acceptance:

- The current Next app can run in a native shell.

Verification:

- iOS/Android projects build locally or documented blocker exists.

### Phase 4: Auth And Routing In App Shell

- [ ] Verify login, signup, onboarding, session restore, and logout.
- [ ] Fix deep links and redirect URLs.
- [ ] Handle app resume/refresh.
- [ ] Add app-shell-specific error states.

Acceptance:

- Mobile users can authenticate reliably.

Verification:

- Auth QA script passes on mobile shell.

### Phase 5: Mobile Core Workflows

- [ ] Verify dashboard, schedule, tasks, messages, forms, inventory counts, and settings.
- [ ] Fix touch targets and mobile forms.
- [ ] Simplify staff workflows.
- [ ] Add manager quick actions.

Acceptance:

- A field user can do daily work from the app.

Verification:

- Manual/mobile smoke checklist passes.

### Phase 6: Push Notifications

- [ ] Choose notification provider.
- [ ] Store device tokens safely.
- [ ] Add notification preferences.
- [ ] Send notifications for tasks, schedule changes, messages, approvals, low stock, and overdue workflows.

Acceptance:

- Mobile app can bring users back to urgent work.

Verification:

- Test notification opens the correct route.

### Phase 7: Offline Queue Foundation

- [ ] Define offline-capable entities.
- [ ] Add mutation queue.
- [ ] Add retry, conflict, and failed-sync UI.
- [ ] Start with tasks/forms/counts.

Acceptance:

- Weak connectivity does not destroy field work.

Verification:

- Offline create/update syncs after reconnect.

### Phase 8: Offline Inventory Counts And Forms

- [ ] Make counts usable offline.
- [ ] Make checklist/form runs usable offline.
- [ ] Store evidence safely.
- [ ] Sync with review status.

Acceptance:

- The highest-value field workflows work offline.

Verification:

- Offline count and form QA passes.

### Phase 9: App Store Readiness

- [ ] Add privacy policy and permissions explanations.
- [ ] Add screenshots and metadata.
- [ ] Add build profiles.
- [ ] Add TestFlight/internal testing flow.

Acceptance:

- Mobile can be submitted for review.

Verification:

- Store checklist is complete.

### Phase 10: Native Future Evaluation

- [ ] Decide whether Capacitor is enough.
- [ ] If needed, plan Expo/native screens for field-heavy workflows.
- [ ] Define shared contracts for native app.
- [ ] Update roadmap status.

Acceptance:

- Mobile strategy evolves from real usage, not guesses.

Verification:

- Native rebuild is only started if justified.

