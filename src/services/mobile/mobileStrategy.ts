export const MOBILE_STRATEGY_VERSION = "2026-05-29";

export type MobileStrategyPath = "capacitor_first";
export type NativeFallbackPath = "expo_native_later";

export type MobileStrategyDecision = {
  readonly version: string;
  readonly selectedPath: MobileStrategyPath;
  readonly fallbackPath: NativeFallbackPath;
  readonly currentRuntime: "nextjs_pwa_mobile_web";
  readonly rewritePolicy: {
    readonly flutterV1: false;
    readonly expoFirstV1: false;
    readonly separateMobileProduct: false;
  };
  readonly v1MustDoWorkflows: readonly string[];
  readonly appStoreRequirements: readonly string[];
  readonly webOnlyForV1: readonly string[];
  readonly nativeEscalationTriggers: readonly string[];
};

export const mobileStrategyDecision: MobileStrategyDecision = {
  version: MOBILE_STRATEGY_VERSION,
  selectedPath: "capacitor_first",
  fallbackPath: "expo_native_later",
  currentRuntime: "nextjs_pwa_mobile_web",
  rewritePolicy: {
    flutterV1: false,
    expoFirstV1: false,
    separateMobileProduct: false,
  },
  v1MustDoWorkflows: [
    "auth_session_restore_logout_tenant_context",
    "today_dashboard_urgent_work_cost_ai_alerts",
    "schedule_shift_detail_manager_quick_actions",
    "tasks_sop_checklists_evidence_review_exceptions",
    "messages_announcements_company_updates",
    "forms_incidents_checklists_approval_status",
    "inventory_countswaste_stock_low_stock_purchasing_handoff",
    "mobileprofile_notifications_language_support_settings",
    "safe_area_navigation_touch_targets_mobile_forms_tables",
  ],
  appStoreRequirements: [
    "apple_developer_and_google_play_accounts",
    "bundleids_app_names_icons_splash_screenshots_metadata",
    "privacy_policy_terms_support_urldata_deletion_export",
    "camera_photo_storage_permission_copy",
    "push_provider_device_tokens_preferences_opt_out",
    "deep_links_redirect_urls_app_bound_domains_supabase_auth",
    "dev_internal_testflight_play_internal_production_buildprofiles",
    "mobile_qa_checklist_for_auth_routing_offline_notifications_workflows",
  ],
  webOnlyForV1: [
    "company_setup_billing_plan_management",
    "role_matrix_permission_registry_support_admin_audit_investigation",
    "complex_report_builders_financial_exports_bulk_imports_migration_tools",
    "deep_analytics_long_form_configuration_desktop_table_editing",
    "deploy_backup_rollback_release_gate_management",
  ],
  nativeEscalationTriggers: [
    "offline_counts_or_formsdata_loss_or_conflict_friction",
    "native_camera_file_compression_background_upload_needed",
    "push_deep_link_route_restore_unreliable_after_capacitor",
    "staff_workflows_need_native_performance_or_gestures",
    "app_store_review_or_platform_policy_requires_native_changes",
  ],
};

export function isMobileStrategyReady(strategy: MobileStrategyDecision = mobileStrategyDecision) {
  return (
    strategy.selectedPath === "capacitor_first" &&
    strategy.fallbackPath === "expo_native_later" &&
    strategy.currentRuntime === "nextjs_pwa_mobile_web" &&
    strategy.rewritePolicy.flutterV1 === false &&
    strategy.rewritePolicy.expoFirstV1 === false &&
    strategy.rewritePolicy.separateMobileProduct === false &&
    strategy.v1MustDoWorkflows.length >= 8 &&
    strategy.appStoreRequirements.length >= 8 &&
    strategy.webOnlyForV1.length >= 5 &&
    strategy.nativeEscalationTriggers.length >= 5
  );
}
