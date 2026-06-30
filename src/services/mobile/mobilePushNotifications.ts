export const MOBILE_PUSH_PROVIDER = "capacitor_push_notifications";
export const MOBILE_PUSH_TOKEN_REGISTRY = "supabase_mobile_push_devices";

export type MobilePushPlatform = "ios" | "android" | "web";

export type MobilePushEventType =
  | "task_assigned"
  | "task_due_soon"
  | "schedule_changed"
  | "message_received"
  | "approval_requested"
  | "low_stock"
  | "workflow_overdue";

export type MobilePushPreferenceKey =
  | "tasks"
  | "schedule_changes"
  | "messages"
  | "approvals"
  | "low_stock"
  | "overdue_workflows";

export type MobilePushPreference = {
  key: MobilePushPreferenceKey;
  label: string;
  defaultEnabled: boolean;
  eventTypes: MobilePushEventType[];
};

export type MobilePushRoute = {
  eventType: MobilePushEventType;
  defaultRoute: string;
  requiredPayloadKeys: string[];
};

export const mobilePushPreferences: MobilePushPreference[] = [
  {
    key: "tasks",
    label: "Tasks",
    defaultEnabled: true,
    eventTypes: ["task_assigned", "task_due_soon"],
  },
  {
    key: "schedule_changes",
    label: "Schedule changes",
    defaultEnabled: true,
    eventTypes: ["schedule_changed"],
  },
  {
    key: "messages",
    label: "Messages",
    defaultEnabled: true,
    eventTypes: ["message_received"],
  },
  {
    key: "approvals",
    label: "Approvals",
    defaultEnabled: true,
    eventTypes: ["approval_requested"],
  },
  {
    key: "low_stock",
    label: "Low stock",
    defaultEnabled: true,
    eventTypes: ["low_stock"],
  },
  {
    key: "overdue_workflows",
    label: "Overdue workflows",
    defaultEnabled: true,
    eventTypes: ["workflow_overdue"],
  },
];

export const mobilePushRoutes: MobilePushRoute[] = [
  {
    eventType: "task_assigned",
    defaultRoute: "/app/tasks",
    requiredPayloadKeys: ["task_id"],
  },
  {
    eventType: "task_due_soon",
    defaultRoute: "/app/tasks",
    requiredPayloadKeys: ["task_id"],
  },
  {
    eventType: "schedule_changed",
    defaultRoute: "/app/enhanced-scheduling",
    requiredPayloadKeys: ["schedule_id"],
  },
  {
    eventType: "message_received",
    defaultRoute: "/app/messages",
    requiredPayloadKeys: ["channel_id"],
  },
  {
    eventType: "approval_requested",
    defaultRoute: "/app/operations",
    requiredPayloadKeys: ["approvalid"],
  },
  {
    eventType: "low_stock",
    defaultRoute: "/app/inventory",
    requiredPayloadKeys: ["item_id"],
  },
  {
    eventType: "workflow_overdue",
    defaultRoute: "/app/operations",
    requiredPayloadKeys: ["workflow_instanceid"],
  },
];

export const mobilePushReadinessChecks = [
  "capacitor_push_notifications_plugin_configured",
  "supabase_stores_device_tokens_through_security_definer_rpc",
  "token_hash_is_stored_for_lookup_without_exposing_raw_token_reads",
  "peruser_preferences_cover_tasks_schedule_messages_approvals_low_stock_overdue_workflows",
  "notification_action_payload_opens_safe_app_route",
  "web_pwa_runtime_does_not_request_native_pushpermissions",
] as const;

export function getDefaultMobilePushPreferences() {
  return Object.fromEntries(
    mobilePushPreferences.map((preference) => [
      preference.key,
      preference.defaultEnabled,
    ]),
  ) as Record<MobilePushPreferenceKey, boolean>;
}

export function isMobilePushRoute(route: string) {
  return route.startsWith("/app/") && !route.startsWith("/app//");
}

export function getMobilePushRouteFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "/app/dashboard";
  }

  const data = payload as Record<string, unknown>;
  const route = typeof data.route === "string" ? data.route : null;
  if (route && isMobilePushRoute(route)) {
    return route;
  }

  const eventType =
    typeof data.event_type === "string"
      ? (data.event_type as MobilePushEventType)
      : typeof data.type === "string"
        ? (data.type as MobilePushEventType)
        : null;
  const routeContract = mobilePushRoutes.find(
    (candidate) => candidate.eventType === eventType,
  );

  return routeContract?.defaultRoute ?? "/app/dashboard";
}

export function isMobilePushNotificationsReady() {
  const preferenceKeys = new Set(
    mobilePushPreferences.map((preference) => preference.key),
  );
  const eventTypes = new Set(
    mobilePushPreferences.flatMap((preference) => preference.eventTypes),
  );
  const routedEventTypes = new Set(
    mobilePushRoutes.map((route) => route.eventType),
  );

  return (
    MOBILE_PUSH_PROVIDER === "capacitor_push_notifications" &&
    MOBILE_PUSH_TOKEN_REGISTRY === "supabase_mobile_push_devices" &&
    preferenceKeys.has("tasks") &&
    preferenceKeys.has("schedule_changes") &&
    preferenceKeys.has("messages") &&
    preferenceKeys.has("approvals") &&
    preferenceKeys.has("low_stock") &&
    preferenceKeys.has("overdue_workflows") &&
    [...eventTypes].every((eventType) => routedEventTypes.has(eventType)) &&
    mobilePushReadinessChecks.includes(
      "notification_action_payload_opens_safe_app_route",
    ) &&
    getMobilePushRouteFromPayload({
      event_type: "low_stock",
      item_id: "item-1",
    }) === "/app/inventory"
  );
}
