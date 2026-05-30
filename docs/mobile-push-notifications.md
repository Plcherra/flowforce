# Mobile Push Notifications

Date: 2026-05-30
Roadmap phase: 08.06 Push Notifications

## Goal

FlowForce mobile must bring users back to urgent operational work from a native notification tap. Phase 08.06 chooses the provider path, adds secure tenant-scoped device registration, defines preference categories, and maps notification payloads to safe app routes.

## Provider Decision

- Native bridge: `@capacitor/push-notifications`.
- Token registry: Supabase tables and security-definer RPCs.
- Native delivery rails: APNs for iOS and FCM for Android through the Capacitor plugin.
- Product sending layer: later server-side workers can select eligible `mobile_push_devices` rows and dispatch through APNs/FCM without exposing raw device tokens to authenticated clients.

This keeps the app on the current Next.js plus Capacitor path. We are not adding Expo, Flutter, or a separate notification vendor for v1.

## Data Contract

- `mobile_push_devices` stores provider, platform, token hash, encrypted-by-access-pattern raw token custody, and registration metadata.
- Authenticated clients cannot read `mobile_push_devices` directly.
- `register_mobile_push_device(...)` is the only authenticated client write path for native device tokens.
- `revoke_mobile_push_device(...)` disables a token without exposing other devices.
- `mobile_push_preferences` stores user-managed preferences per company.

Preference categories:

- Tasks
- Schedule changes
- Messages
- Approvals
- Low stock
- Overdue workflows

## Route Contract

Notification action payloads may include a safe `/app/...` route. If no route is present, the app falls back by event type:

- `task_assigned` and `task_due_soon`: `/app/tasks`
- `schedule_changed`: `/app/enhanced-scheduling`
- `message_received`: `/app/messages`
- `approval_requested`: `/app/operations`
- `low_stock`: `/app/inventory`
- `workflow_overdue`: `/app/operations`

Unsafe external routes are ignored and fall back to `/app/dashboard`.

## Runtime Behavior

- Web/PWA browser runtime does not request native push permissions.
- Native Capacitor runtime checks permissions after authenticated app-shell load.
- Granted native permission registers the device token through Supabase RPC.
- Notification taps route users back into the correct urgent-work screen.

## Manual Mobile Checklist

- Sync Capacitor after installing the plugin: `npm run mobile:cap:sync`.
- Build/open iOS and Android shells.
- Confirm iOS and Android request notification permission only after login.
- Confirm a registration token creates a `mobile_push_devices` row through the RPC.
- Confirm a test payload with `route: "/app/tasks"` opens Tasks.
- Confirm a test payload with `event_type: "low_stock"` opens Inventory.
- Confirm external routes are rejected and open Dashboard.

## Verification

08.06 is complete when:

- `npm run check:mobile-push-notifications` passes.
- `npm run check:mobile-capacitor` passes after plugin sync.
- `npm run check:local` passes.
- The latest visible-module smoke report remains green.
