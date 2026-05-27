# Phase 02.05 - App Shell Architecture

Date: 2026-05-27

## Summary

Added a typed app-shell architecture contract so web and future mobile wrapper work can share predictable route behavior without changing runtime UI yet.

The current shell already has the major implementation pieces:

- `app/app/AppLayoutClient.tsx`
- `src/app-shell/AppShell.tsx`
- `src/app-shell/navigation/NavigationGuard.tsx`
- `src/app-shell/guards/ProtectedRoute.tsx`
- `src/app-shell/tenant/TenantSetupRequired.tsx`
- `src/shared/components/FeatureLoadingState.tsx`
- `src/shared/components/FeatureEmptyState.tsx`
- `src/shared/components/FeatureSetupRequiredState.tsx`
- `src/shared/components/FeatureErrorState.tsx`

This phase makes those rules explicit.

## Files Added

- `src/app-shell/architecture.ts`
- `src/app-shell/index.ts`
- `src/shared/components/index.ts`

## Responsive Shell Rules

Mobile:

- Viewport starts at 0px.
- Sidebar mode should be drawer.
- Top navigation should be compact.
- Content padding should be compact.

Tablet:

- Viewport starts at 768px.
- Sidebar mode should be collapsible.
- Top navigation should be standard.
- Content padding should be comfortable.

Desktop:

- Viewport starts at 1024px.
- Sidebar mode should be collapsible.
- Top navigation should be standard.
- Content padding should be comfortable.

## Guard And Tenant Loading Order

The shell contract records this guard order:

1. Root error boundary.
2. Suspense loading.
3. Navigation guard.
4. Protected route.
5. Profile and tenant context.
6. Tenant setup required.
7. Sidebar provider.
8. Route error boundary.

Current implementation already follows this shape through `AppLayoutClient`, `NavigationGuard`, `ProtectedRoute`, and `AppShell`.

## Shared Shell States

The shared state contract maps common feature states to stable components:

- Loading: `FeatureLoadingState`
- Empty: `FeatureEmptyState`
- Setup required: `FeatureSetupRequiredState`
- Beta: `FeatureSetupRequiredState`
- Error: `FeatureErrorState`

Future modules should use these shared states before creating feature-specific alternatives.

## Route Ownership Contract

Production pilot routes:

- `/app/dashboard`: `src/features/dashboard`
- `/app/enhanced-scheduling`: `src/features/scheduling`
- `/app/tasks`: `src/features/tasks`
- `/app/messages`: `src/features/messages`
- `/app/company-updates`: `src/features/company-updates`
- `/app/forms`: `src/features/forms`
- `/app/inventory`: `src/features/inventory`
- `/app/inventory/purchasing`: `src/features/inventory`
- `/app/reports`: `src/features/analytics`
- `/app/employees`: `src/features/employees`
- `/app/settings`: `src/features/system`

Beta routes:

- `/app/ai-insights`
- `/app/operations`
- `/app/analytics`

Internal routes:

- `/app/permission-demo`
- `/app/add-section`

## Layout Pattern

Authenticated app routes should follow this pattern:

- Page route under `app/app/*`.
- Thin page wrapper imports the feature page.
- Feature page owns module UI and module-specific state.
- Shared shell owns auth, tenant loading, sidebar, top nav, and page-level error boundary.
- Feature modules use shared loading, empty, setup-required, and error states.

## Mobile Wrapper Implication

The future Capacitor shell should preserve this route behavior:

- Authenticated routes remain under `/app`.
- Tenant setup failure still shows repair/retry UX.
- Mobile pilot navigation should show only production pilot routes unless beta/internal routes are explicitly enabled.
- Staff and manager mobile flows should not depend on desktop-only route structure.

## Verification

Commands run:

```bash
npm run typecheck:src
npm run typecheck
```

Result:

- `typecheck:src` passed.
- Full scoped typecheck passed for app, tests, and Supabase scopes.

Smoke note:

- Authenticated visible-module smoke was not run in this phase because the change was an additive typed architecture contract and barrels. Smoke should run when the shell begins consuming the new route ownership contract at runtime.

## Acceptance Result

- Responsive shell rules defined.
- Route guards and tenant context loading order documented.
- Loading, empty, beta, setup-required, and error states normalized through shared state contracts.
- Route ownership and layout patterns documented.

## Next Phase

Continue to Phase 02.06: package strategy.
