-- Covering indexes for public foreign keys flagged by the
-- unindexed_foreign_keys advisor. Additive only.

create index if not exists ai_budget_controls_created_by_idx
  on public.ai_budget_controls (created_by);

create index if not exists ai_budget_controls_updated_by_idx
  on public.ai_budget_controls (updated_by);

create index if not exists ai_compliance_workflow_suggestions_approved_by_idx
  on public.ai_compliance_workflow_suggestions (approved_by);

create index if not exists ai_compliance_workflow_suggestions_created_by_idx
  on public.ai_compliance_workflow_suggestions (created_by);

create index if not exists ai_compliance_workflow_suggestions_rejected_by_idx
  on public.ai_compliance_workflow_suggestions (rejected_by);

create index if not exists ai_governance_policies_created_by_idx
  on public.ai_governance_policies (created_by);

create index if not exists ai_inventory_waste_suggestions_approved_by_idx
  on public.ai_inventory_waste_suggestions (approved_by);

create index if not exists ai_inventory_waste_suggestions_created_by_idx
  on public.ai_inventory_waste_suggestions (created_by);

create index if not exists ai_inventory_waste_suggestions_rejected_by_idx
  on public.ai_inventory_waste_suggestions (rejected_by);

create index if not exists ai_manager_briefing_runs_generated_by_idx
  on public.ai_manager_briefing_runs (generated_by);

create index if not exists ai_recommendation_feedback_created_by_idx
  on public.ai_recommendation_feedback (created_by);

create index if not exists ai_scheduling_suggestions_approved_by_idx
  on public.ai_scheduling_suggestions (approved_by);

create index if not exists ai_scheduling_suggestions_created_by_idx
  on public.ai_scheduling_suggestions (created_by);

create index if not exists ai_scheduling_suggestions_rejected_by_idx
  on public.ai_scheduling_suggestions (rejected_by);

create index if not exists ai_usage_events_created_by_idx
  on public.ai_usage_events (created_by);

create index if not exists ai_usage_events_user_id_idx
  on public.ai_usage_events (user_id);

create index if not exists company_data_exports_requested_by_idx
  on public.company_data_exports (requested_by);

create index if not exists company_invites_store_id_idx
  on public.company_invites (store_id);

create index if not exists company_roles_department_id_idx
  on public.company_roles (department_id);

create index if not exists company_updates_author_id_idx
  on public.company_updates (author_id);

create index if not exists custom_sections_created_by_idx
  on public.custom_sections (created_by);

create index if not exists employee_onboarding_enrollments_invite_id_idx
  on public.employee_onboarding_enrollments (invite_id);

create index if not exists employee_onboarding_progress_company_id_idx
  on public.employee_onboarding_progress (company_id);

create index if not exists employee_onboarding_progress_step_id_idx
  on public.employee_onboarding_progress (step_id);

create index if not exists employee_onboarding_steps_document_id_idx
  on public.employee_onboarding_steps (document_id);

create index if not exists expenses_approved_by_idx
  on public.expenses (approved_by);

create index if not exists expenses_created_by_idx
  on public.expenses (created_by);

create index if not exists form_access_rules_created_by_idx
  on public.form_access_rules (created_by);

create index if not exists form_reviewer_rules_created_by_idx
  on public.form_reviewer_rules (created_by);

create index if not exists integration_import_batches_started_by_idx
  on public.integration_import_batches (started_by);

create index if not exists inv_adjustments_lot_id_idx
  on public.inv_adjustments (lot_id);

create index if not exists inv_count_lines_lot_id_idx
  on public.inv_count_lines (lot_id);

create index if not exists inv_count_lines_unit_id_idx
  on public.inv_count_lines (unit_id);

create index if not exists inv_count_locations_location_id_idx
  on public.inv_count_locations (location_id);

create index if not exists inv_items_created_by_idx
  on public.inv_items (created_by);

create index if not exists inv_par_overrides_created_by_idx
  on public.inv_par_overrides (created_by);

create index if not exists inv_par_profiles_created_by_idx
  on public.inv_par_profiles (created_by);

create index if not exists inv_prep_batches_created_by_idx
  on public.inv_prep_batches (created_by);

create index if not exists inv_production_approvals_action_by_idx
  on public.inv_production_approvals (action_by);

create index if not exists inv_production_events_approved_by_idx
  on public.inv_production_events (approved_by);

create index if not exists inv_production_events_created_by_idx
  on public.inv_production_events (created_by);

create index if not exists inv_production_events_produced_unit_id_idx
  on public.inv_production_events (produced_unit_id);

create index if not exists inv_production_events_waste_unit_id_idx
  on public.inv_production_events (waste_unit_id);

create index if not exists inv_production_events_yield_unit_id_idx
  on public.inv_production_events (yield_unit_id);

create index if not exists inv_production_materials_ingredient_item_id_idx
  on public.inv_production_materials (ingredient_item_id);

create index if not exists inv_production_materials_unit_id_idx
  on public.inv_production_materials (unit_id);

create index if not exists inv_purchases_created_by_idx
  on public.inv_purchases (created_by);

create index if not exists inv_units_base_unit_id_idx
  on public.inv_units (base_unit_id);

create index if not exists inv_units_parent_unit_id_idx
  on public.inv_units (parent_unit_id);

create index if not exists inv_waste_lot_id_idx
  on public.inv_waste (lot_id);

create index if not exists inventory_items_created_by_idx
  on public.inventory_items (created_by);

create index if not exists learning_progress_company_id_idx
  on public.learning_progress (company_id);

create index if not exists learning_progress_enrollment_id_idx
  on public.learning_progress (enrollment_id);

create index if not exists learning_progress_module_id_idx
  on public.learning_progress (module_id);

create index if not exists learning_progress_recorded_by_idx
  on public.learning_progress (recorded_by);

create index if not exists learning_progress_events_created_by_idx
  on public.learning_progress_events (created_by);

create index if not exists learning_progress_events_enrollment_id_idx
  on public.learning_progress_events (enrollment_id);

create index if not exists learning_progress_events_module_id_idx
  on public.learning_progress_events (module_id);

create index if not exists lifecycle_legal_holds_held_by_idx
  on public.lifecycle_legal_holds (held_by);

create index if not exists lifecycle_legal_holds_released_by_idx
  on public.lifecycle_legal_holds (released_by);

create index if not exists mobile_push_devices_user_id_idx
  on public.mobile_push_devices (user_id);

create index if not exists mobile_push_preferences_user_id_idx
  on public.mobile_push_preferences (user_id);

create index if not exists ops_issues_ai_suggestion_id_idx
  on public.ops_issues (ai_suggestion_id);

create index if not exists ops_issues_task_id_idx
  on public.ops_issues (task_id);

create index if not exists ops_issues_workflow_exception_id_idx
  on public.ops_issues (workflow_exception_id);

create index if not exists ops_issues_workflow_instance_id_idx
  on public.ops_issues (workflow_instance_id);

create index if not exists payments_approved_by_idx
  on public.payments (approved_by);

create index if not exists payments_created_by_idx
  on public.payments (created_by);

create index if not exists payments_recipient_id_idx
  on public.payments (recipient_id);

create index if not exists purchase_orders_approved_by_idx
  on public.purchase_orders (approved_by);

create index if not exists purchase_orders_created_by_idx
  on public.purchase_orders (created_by);

create index if not exists shift_swaps_requesting_user_id_idx
  on public.shift_swaps (requesting_user_id);

create index if not exists shift_swaps_target_user_id_idx
  on public.shift_swaps (target_user_id);

create index if not exists support_tool_runs_target_user_id_idx
  on public.support_tool_runs (target_user_id);

create index if not exists workflow_evidence_step_instance_id_idx
  on public.workflow_evidence (step_instance_id);

create index if not exists workflow_exceptions_linked_ops_issue_id_idx
  on public.workflow_exceptions (linked_ops_issue_id);

create index if not exists workflow_exceptions_linked_task_id_idx
  on public.workflow_exceptions (linked_task_id);

create index if not exists workflow_exceptions_workflow_instance_id_idx
  on public.workflow_exceptions (workflow_instance_id);
