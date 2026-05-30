import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const doc = readText("docs/mobile-push-notifications.md");
const report = readText(
  "docs/roadmap/reports/08-06-push-notifications-2026-05-30.md",
);
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText("src/services/mobile/mobilePushNotifications.ts");
const hook = readText("src/hooks/useMobilePushNotifications.ts");
const appShell = readText("src/app-shell/AppShell.tsx");
const capacitorConfig = readText("capacitor.config.ts");
const migration = readText(
  "supabase/migrations/20260530000100_phase8_mobile_push_notifications.sql",
);
const packageJson = readText("package.json");
const smokeReport = JSON.parse(
  readText("docs/test-results/visible-modules-smoke.json"),
);

requireIncludes(
  doc,
  [
    "@capacitor/push-notifications",
    "Supabase tables and security-definer RPCs",
    "Tasks",
    "Schedule changes",
    "Messages",
    "Approvals",
    "Low stock",
    "Overdue workflows",
    "Unsafe external routes are ignored",
    "npm run check:mobile-push-notifications",
  ],
  "mobile push notifications doc",
);

requireIncludes(
  service,
  [
    "MOBILE_PUSH_PROVIDER",
    "capacitor_push_notifications",
    "mobilePushPreferences",
    "mobilePushRoutes",
    "getMobilePushRouteFromPayload",
    "getDefaultMobilePushPreferences",
    "isMobilePushNotificationsReady",
    "workflow_overdue",
  ],
  "mobile push service",
);

requireIncludes(
  hook,
  [
    "useMobilePushNotifications",
    "@capacitor/push-notifications",
    "Capacitor.isNativePlatform",
    "register_mobile_push_device",
    "pushNotificationActionPerformed",
    "getMobilePushRouteFromPayload",
  ],
  "mobile push hook",
);

requireIncludes(
  appShell,
  ["useMobilePushNotifications", "companyId: profileState.profile?.companyId"],
  "app shell mobile push registration",
);

requireIncludes(
  capacitorConfig,
  [
    "PushNotifications",
    'presentationOptions: ["badge", "sound", "alert"]',
  ],
  "Capacitor push plugin config",
);

requireIncludes(
  migration,
  [
    "create table if not exists public.mobile_push_devices",
    "revoke all on public.mobile_push_devices from authenticated",
    "create table if not exists public.mobile_push_preferences",
    "register_mobile_push_device",
    "revoke_mobile_push_device",
    "extensions.digest",
    "current_user_company_ids",
    "capacitor_push_notifications",
  ],
  "mobile push migration",
);

requireIncludes(
  plan,
  [
    "- [x] Choose notification provider.",
    "- [x] Store device tokens safely.",
    "- [x] Add notification preferences.",
    "- [x] Send notifications for tasks, schedule changes, messages, approvals, low stock, and overdue workflows.",
    "08.06 Push Notifications",
    "mobile-push-notifications.md",
  ],
  "Plan 08 roadmap",
);

const phaseSixBlock = plan.match(
  /### Phase 6: Push Notifications[\s\S]*?(?=### Phase 7: Offline Queue Foundation)/,
)?.[0];

if (!phaseSixBlock || phaseSixBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 6 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [09 Integrations And Migration Tools]",
    "Last completed phase: 09.04, Checklist Platform Migration Path",
    "Last phase report: [09.04 Checklist Platform Migration Path]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "native push-notification foundation",
    "Supabase-owned token registration",
    "20260530000100_phase8_mobile_push_notifications.sql",
    "npm run check:mobile-push-notifications",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  packageJson,
  [
    "@capacitor/push-notifications",
    "check:mobile-push-notifications",
    "scripts/check-mobile-push-notifications-contract.mjs",
  ],
  "package scripts and dependency",
);

if (smokeReport.summary?.failed !== 0) {
  throw new Error("Latest visible-module smoke report is not green");
}

const smokeWarnings = Array.isArray(smokeReport.results)
  ? smokeReport.results.flatMap((result) => result.warnings ?? [])
  : [];
if (smokeWarnings.length > 0) {
  throw new Error("Latest visible-module smoke report still has warnings");
}

const push = await jiti.import(
  join(root, "src/services/mobile/mobilePushNotifications.ts"),
);

if (!push.isMobilePushNotificationsReady()) {
  throw new Error("Mobile push notification contract is not ready");
}

if (push.getMobilePushRouteFromPayload({ route: "https://example.com" }) !== "/app/dashboard") {
  throw new Error("External push routes must fall back to dashboard");
}

if (push.getMobilePushRouteFromPayload({ event_type: "message_received" }) !== "/app/messages") {
  throw new Error("Message push event should route to messages");
}

process.stdout.write("OK mobile push notifications contract\n");
