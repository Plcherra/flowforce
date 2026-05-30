export const MOBILE_RESPONSIVE_BASELINE_VERSION = "2026-05-29";

export type ResponsiveViewport = {
  readonly name: "desktop" | "mobile";
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
};

export const responsiveBaselineViewports: readonly ResponsiveViewport[] = [
  { name: "desktop", width: 1366, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

export const responsiveBaselineRoutes = [
  "Dashboard",
  "Scheduling",
  "Tasks",
  "Messages",
  "Company Updates",
  "Forms",
  "Inventory",
  "Purchasing / Waste",
  "Reports",
  "Team",
  "Settings",
] as const;

export const responsiveBaselineChecks = [
  "authenticated_access",
  "non_empty_content",
  "no_application_error_shell",
  "console_page_network_diagnostics",
  "desktop_and_mobile_viewports",
  "horizontal_overflow_failure",
  "mobile_touch_target_warnings",
  "safe_area_viewport_container",
] as const;

export const mobileResponsiveDebt = [
  "data_dense_modules_need_workflow_specific_mobile_simplification",
  "touch_target_warnings_are_not_build_blockers_yet",
  "offline_behavior_deferred_to_08_07_and_08_08",
  "native_shell_auth_deferred_to_08_04",
  "push_routing_deferred_to_08_06",
] as const;

export function isMobileResponsiveBaselineReady() {
  const hasDesktop = responsiveBaselineViewports.some(
    (viewport) => viewport.name === "desktop" && viewport.width >= 1280,
  );
  const hasMobile = responsiveBaselineViewports.some(
    (viewport) => viewport.name === "mobile" && viewport.width <= 430 && viewport.isMobile,
  );

  return (
    hasDesktop &&
    hasMobile &&
    responsiveBaselineRoutes.length >= 10 &&
    responsiveBaselineChecks.includes("horizontal_overflow_failure") &&
    responsiveBaselineChecks.includes("mobile_touch_target_warnings") &&
    responsiveBaselineChecks.includes("safe_area_viewport_container") &&
    mobileResponsiveDebt.length >= 5
  );
}
