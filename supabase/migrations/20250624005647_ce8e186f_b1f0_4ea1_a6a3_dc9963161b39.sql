
-- Performance optimization indexes for foreign key columns
-- These will run together but may cause brief table locks

-- Analytics cache table
CREATE INDEX IF NOT EXISTS idx_analytics_cache_cache_key ON public.analytics_cache(cache_key);

-- Channel members table
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);

-- Company invites table
CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_invited_by ON public.company_invites(invited_by);

-- Company roles table
CREATE INDEX IF NOT EXISTS idx_company_roles_company_id ON public.company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_company_roles_created_by ON public.company_roles(created_by);

-- Custom reports table
CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON public.custom_reports(created_by);

-- Departments table
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments(manager_id);

-- Expenses table
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON public.expenses(approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);

-- Form fields table
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON public.form_fields(form_id);

-- Form submission files table
CREATE INDEX IF NOT EXISTS idx_form_submission_files_submission_id ON public.form_submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_files_field_id ON public.form_submission_files(field_id);

-- Form submissions table
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_by ON public.form_submissions(submitted_by);

-- Forms table
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_department_id ON public.forms(department_id);

-- Inventory items table
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by ON public.inventory_items(created_by);

-- Inventory transactions table
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON public.inventory_transactions(performed_by);

-- Message channels table
CREATE INDEX IF NOT EXISTS idx_message_channels_department_id ON public.message_channels(department_id);
CREATE INDEX IF NOT EXISTS idx_message_channels_created_by ON public.message_channels(created_by);

-- Message reactions table
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Messages table
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Payment approvals table
CREATE INDEX IF NOT EXISTS idx_payment_approvals_payment_id ON public.payment_approvals(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_approver_id ON public.payment_approvals(approver_id);

-- Payments table
CREATE INDEX IF NOT EXISTS idx_payments_recipient_id ON public.payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_approved_by ON public.payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);

-- Positions table
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON public.positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_role_id ON public.positions(role_id);

-- Profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_position_id ON public.profiles(position_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- Purchase order items table
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id ON public.purchase_order_items(item_id);

-- Purchase orders table
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_by ON public.purchase_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders(created_by);

-- Report schedules table
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON public.report_schedules(report_id);

-- Role permissions table
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);

-- Schedules table
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_department_id ON public.schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_schedules_job_position_id ON public.schedules(job_position_id);
CREATE INDEX IF NOT EXISTS idx_schedules_created_by ON public.schedules(created_by);

-- Shift assignments table
CREATE INDEX IF NOT EXISTS idx_shift_assignments_schedule_id ON public.shift_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_user_id ON public.shift_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_assigned_by ON public.shift_assignments(assigned_by);

-- Shift templates table
CREATE INDEX IF NOT EXISTS idx_shift_templates_company_id ON public.shift_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_created_by ON public.shift_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_shift_templates_job_position_id ON public.shift_templates(job_position_id);

-- Task comments table
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- Task workflow instances table
CREATE INDEX IF NOT EXISTS idx_task_workflow_instances_task_id ON public.task_workflow_instances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_workflow_instances_workflow_id ON public.task_workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_task_workflow_instances_current_step_id ON public.task_workflow_instances(current_step_id);

-- Tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON public.tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- Time entries table
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_schedule_id ON public.time_entries(schedule_id);

-- Time off requests table
CREATE INDEX IF NOT EXISTS idx_time_off_requests_user_id ON public.time_off_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_approved_by ON public.time_off_requests(approved_by);

-- User roles table
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_department_id ON public.user_roles(department_id);

-- User unavailability table
CREATE INDEX IF NOT EXISTS idx_user_unavailability_user_id ON public.user_unavailability(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unavailability_created_by ON public.user_unavailability(created_by);

-- Week templates table
CREATE INDEX IF NOT EXISTS idx_week_templates_company_id ON public.week_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_week_templates_created_by ON public.week_templates(created_by);

-- Workflow step instances table
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_step_id ON public.workflow_step_instances(step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_workflow_instance_id ON public.workflow_step_instances(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_assigned_to ON public.workflow_step_instances(assigned_to);

-- Workflow steps table
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_assigned_user_id ON public.workflow_steps(assigned_user_id);

-- Workflows table
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON public.workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_department_id ON public.workflows(department_id);
