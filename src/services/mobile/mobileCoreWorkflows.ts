export type MobileWorkflowAudience = "staff" | "manager" | "both";

export type MobileCoreWorkflowId =
  | "dashboard"
  | "schedule"
  | "tasks"
  | "messages"
  | "forms"
  | "inventory_counts"
  | "settings";

export type MobileQuickActionId =
  | "today_dashboard"
  | "view_schedule"
  | "open_tasks"
  | "send_message"
  | "fill_form"
  | "start_inventory_count"
  | "profile_notifications"
  | "manager_create_task"
  | "manager_review_schedule"
  | "manager_open_reports";

export type MobileCoreWorkflow = {
  id: MobileCoreWorkflowId;
  label: string;
  route: string;
  audience: MobileWorkflowAudience;
  dailyUse: string;
  requiredMobileCapabilities: string[];
  primaryQuickActions: MobileQuickActionId[];
};

export type MobileQuickAction = {
  id: MobileQuickActionId;
  label: string;
  description: string;
  route: string;
  audience: MobileWorkflowAudience;
  workflowId: MobileCoreWorkflowId;
};

export const mobileCoreWorkflows: MobileCoreWorkflow[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/app/dashboard",
    audience: "both",
    dailyUse: "Start the shift, spot urgent work, and jump into execution.",
    requiredMobileCapabilities: [
      "today_command_center",
      "urgent_work_summary",
      "mobile_quick_actions",
    ],
    primaryQuickActions: ["view_schedule", "open_tasks", "send_message"],
  },
  {
    id: "schedule",
    label: "Schedule",
    route: "/app/enhanced-scheduling",
    audience: "both",
    dailyUse: "Review shifts, staffing risk, and manager schedule decisions.",
    requiredMobileCapabilities: [
      "shift_read_access",
      "availability_context",
      "manager_schedule_review",
    ],
    primaryQuickActions: ["view_schedule", "manager_review_schedule"],
  },
  {
    id: "tasks",
    label: "Tasks",
    route: "/app/tasks",
    audience: "both",
    dailyUse: "Complete assigned work and create follow-up tasks.",
    requiredMobileCapabilities: [
      "task_list",
      "task_detail",
      "task_create",
      "task_status_update",
    ],
    primaryQuickActions: ["open_tasks", "manager_create_task"],
  },
  {
    id: "messages",
    label: "Messages",
    route: "/app/messages",
    audience: "both",
    dailyUse: "Coordinate with the team during the shift.",
    requiredMobileCapabilities: [
      "channel_list",
      "thread_read",
      "message_send",
      "availability_toggle",
    ],
    primaryQuickActions: ["send_message"],
  },
  {
    id: "forms",
    label: "Forms",
    route: "/app/forms",
    audience: "both",
    dailyUse: "Fill checklists, reports, and review-ready operational forms.",
    requiredMobileCapabilities: [
      "form_search",
      "form_fill",
      "published_form_filter",
      "submission_status",
    ],
    primaryQuickActions: ["fill_form"],
  },
  {
    id: "inventory_counts",
    label: "Inventory Counts",
    route: "/app/inventory/counts",
    audience: "both",
    dailyUse: "Start or resume inventory counts from the floor.",
    requiredMobileCapabilities: [
      "count_list",
      "count_start",
      "count_detail",
      "stock_position_entry",
    ],
    primaryQuickActions: ["start_inventory_count"],
  },
  {
    id: "settings",
    label: "Settings",
    route: "/app/settings",
    audience: "both",
    dailyUse: "Reach profile, notifications, language, and support settings.",
    requiredMobileCapabilities: [
      "profile_access",
      "notification_preferences",
      "language_context",
      "support_access",
    ],
    primaryQuickActions: ["profile_notifications"],
  },
];

export const mobileCoreQuickActions: MobileQuickAction[] = [
  {
    id: "today_dashboard",
    label: "Today",
    description: "Open the command center.",
    route: "/app/dashboard",
    audience: "both",
    workflowId: "dashboard",
  },
  {
    id: "view_schedule",
    label: "Schedule",
    description: "Check shifts and coverage.",
    route: "/app/enhanced-scheduling",
    audience: "both",
    workflowId: "schedule",
  },
  {
    id: "open_tasks",
    label: "Tasks",
    description: "See assigned work.",
    route: "/app/tasks",
    audience: "both",
    workflowId: "tasks",
  },
  {
    id: "send_message",
    label: "Messages",
    description: "Coordinate with the team.",
    route: "/app/messages",
    audience: "both",
    workflowId: "messages",
  },
  {
    id: "fill_form",
    label: "Forms",
    description: "Fill checklists and reports.",
    route: "/app/forms",
    audience: "both",
    workflowId: "forms",
  },
  {
    id: "start_inventory_count",
    label: "Counts",
    description: "Start or resume a count.",
    route: "/app/inventory/counts",
    audience: "both",
    workflowId: "inventory_counts",
  },
  {
    id: "profile_notifications",
    label: "Settings",
    description: "Profile and notifications.",
    route: "/app/settings",
    audience: "both",
    workflowId: "settings",
  },
  {
    id: "manager_create_task",
    label: "Create task",
    description: "Assign follow-up work.",
    route: "/app/tasks",
    audience: "manager",
    workflowId: "tasks",
  },
  {
    id: "manager_review_schedule",
    label: "Review labor",
    description: "Tune coverage and labor.",
    route: "/app/enhanced-scheduling",
    audience: "manager",
    workflowId: "schedule",
  },
  {
    id: "manager_open_reports",
    label: "Reports",
    description: "Review manager risk.",
    route: "/app/reports",
    audience: "manager",
    workflowId: "dashboard",
  },
];

export const mobileCoreWorkflowChecks = [
  "dashboard_schedule_tasks_messages_forms_counts_settings_routes_exist",
  "mobile_dashboard_exposes_daily_field_actions",
  "staff_workflows_have_one_tap_entry_points",
  "manager_quick_actions_are_defined",
  "touch_targets_are_covered_by_visible_module_smoke",
  "forms_and_counts_areidentified_as_field_execution_workflows",
] as const;

export function getMobileCoreWorkflowById(id: MobileCoreWorkflowId) {
  return mobileCoreWorkflows.find((workflow) => workflow.id === id) ?? null;
}

export function getMobileQuickActionsForAudience(
  audience: MobileWorkflowAudience,
) {
  return mobileCoreQuickActions.filter(
    (action) => action.audience === "both" || action.audience === audience,
  );
}

export function isMobileCoreWorkflowsReady() {
  const requiredIds: MobileCoreWorkflowId[] = [
    "dashboard",
    "schedule",
    "tasks",
    "messages",
    "forms",
    "inventory_counts",
    "settings",
  ];

  const workflowIds = new Set(mobileCoreWorkflows.map((workflow) => workflow.id));
  const quickActionRoutes = new Set(
    mobileCoreQuickActions.map((action) => action.route),
  );

  return (
    requiredIds.every((id) => workflowIds.has(id)) &&
    quickActionRoutes.has("/app/inventory/counts") &&
    quickActionRoutes.has("/app/settings") &&
    getMobileQuickActionsForAudience("staff").length >= 7 &&
    getMobileQuickActionsForAudience("manager").some(
      (action) => action.id === "manager_review_schedule",
    ) &&
    mobileCoreWorkflowChecks.includes(
      "touch_targets_are_covered_by_visible_module_smoke",
    )
  );
}
