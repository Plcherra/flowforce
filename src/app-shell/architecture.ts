import type { ModuleLifecycle, ModuleSlug, UserRole } from "@/types/platform";

export type ShellViewport = "mobile" | "tablet" | "desktop";
export type ShellRouteKind =
  | "public"
  | "auth"
  | "app"
  | "redirect"
  | "internal"
  | "api";
export type ShellStateKind =
  | "loading"
  | "empty"
  | "setup_required"
  | "beta"
  | "error";

export interface ShellViewportRule {
  viewport: ShellViewport;
  minWidth: number;
  sidebar: "hidden" | "drawer" | "collapsible";
  topNav: "compact" | "standard";
  contentPadding: "compact" | "comfortable";
}

export interface ShellRouteOwnership {
  path: string;
  kind: ShellRouteKind;
  module?: ModuleSlug;
  lifecycle: ModuleLifecycle;
  owner: string;
  allowedRoles?: UserRole[];
  notes?: string;
}

export interface ShellStateContract {
  kind: ShellStateKind;
  component: string;
  useFor: string;
}

export const shellViewportRules: ShellViewportRule[] = [
  {
    viewport: "mobile",
    minWidth: 0,
    sidebar: "drawer",
    topNav: "compact",
    contentPadding: "compact",
  },
  {
    viewport: "tablet",
    minWidth: 768,
    sidebar: "collapsible",
    topNav: "standard",
    contentPadding: "comfortable",
  },
  {
    viewport: "desktop",
    minWidth: 1024,
    sidebar: "collapsible",
    topNav: "standard",
    contentPadding: "comfortable",
  },
];

export const shellGuardOrder = [
  "root-error-boundary",
  "suspense-loading",
  "navigation-guard",
  "protected-route",
  "profile-and-tenant-context",
  "tenant-setup-required",
  "sidebar-provider",
  "route-error-boundary",
] as const;

export const shellStateContracts: ShellStateContract[] = [
  {
    kind: "loading",
    component: "FeatureLoadingState",
    useFor: "Feature-level data loading and setup checks.",
  },
  {
    kind: "empty",
    component: "FeatureEmptyState",
    useFor: "Valid empty module data after setup is complete.",
  },
  {
    kind: "setup_required",
    component: "FeatureSetupRequiredState",
    useFor: "Modules hidden or blocked until tenant setup data exists.",
  },
  {
    kind: "beta",
    component: "FeatureSetupRequiredState",
    useFor: "Beta/internal modules that need an explicit gate or explanation.",
  },
  {
    kind: "error",
    component: "FeatureErrorState",
    useFor: "Recoverable feature-level load or mutation failures.",
  },
];

export const shellRouteOwnership: ShellRouteOwnership[] = [
  {
    path: "/app/dashboard",
    kind: "app",
    module: "dashboard",
    lifecycle: "production",
    owner: "src/features/dashboard",
  },
  {
    path: "/app/enhanced-scheduling",
    kind: "app",
    module: "schedule",
    lifecycle: "production",
    owner: "src/features/scheduling",
  },
  {
    path: "/app/tasks",
    kind: "app",
    module: "tasks",
    lifecycle: "production",
    owner: "src/features/tasks",
  },
  {
    path: "/app/messages",
    kind: "app",
    module: "messages",
    lifecycle: "production",
    owner: "src/features/messages",
  },
  {
    path: "/app/company-updates",
    kind: "app",
    module: "company_updates",
    lifecycle: "production",
    owner: "src/features/company-updates",
  },
  {
    path: "/app/forms",
    kind: "app",
    module: "forms",
    lifecycle: "production",
    owner: "src/features/forms",
  },
  {
    path: "/app/inventory",
    kind: "app",
    module: "inventory",
    lifecycle: "production",
    owner: "src/features/inventory",
  },
  {
    path: "/app/inventory/purchasing",
    kind: "app",
    module: "purchasing",
    lifecycle: "production",
    owner: "src/features/inventory",
  },
  {
    path: "/app/reports",
    kind: "app",
    module: "reports",
    lifecycle: "production",
    owner: "src/features/analytics",
  },
  {
    path: "/app/employees",
    kind: "app",
    module: "team",
    lifecycle: "production",
    owner: "src/features/employees",
  },
  {
    path: "/app/settings",
    kind: "app",
    module: "settings",
    lifecycle: "production",
    owner: "src/features/system",
  },
  {
    path: "/app/ai-insights",
    kind: "app",
    module: "ai_insights",
    lifecycle: "beta",
    owner: "src/features/analytics/pages/AIInsights",
  },
  {
    path: "/app/operations",
    kind: "app",
    module: "operations",
    lifecycle: "beta",
    owner: "src/features/operations",
  },
  {
    path: "/app/analytics",
    kind: "app",
    module: "analytics",
    lifecycle: "beta",
    owner: "src/features/analytics",
  },
  {
    path: "/app/permission-demo",
    kind: "internal",
    module: "custom_sections",
    lifecycle: "internal",
    owner: "src/features/permissions",
    notes: "Internal permission demonstration route; keep out of pilot navigation.",
  },
  {
    path: "/app/add-section",
    kind: "internal",
    module: "custom_sections",
    lifecycle: "internal",
    owner: "src/features/sections",
    notes: "Custom section management route; keep behind admin/internal controls.",
  },
];

export const getShellRouteOwnership = (path: string) =>
  shellRouteOwnership.find((route) => path.startsWith(route.path)) ?? null;

