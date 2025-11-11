
-- Performance-critical indexes for foreign key columns
-- Standard index creation (without CONCURRENTLY for migration compatibility)

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_position_id ON public.profiles(position_id);

-- Company-related indexes
CREATE INDEX IF NOT EXISTS idx_company_roles_company_id ON public.company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_role_id ON public.positions(role_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON public.positions(department_id);

-- Task and workflow indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- Schedule and time tracking indexes
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_department_id ON public.schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_schedule_id ON public.time_entries(schedule_id);

-- Forms and submissions indexes
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_department_id ON public.forms(department_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_by ON public.form_submissions(submitted_by);

-- Messaging indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_recipient_id ON public.payments(recipient_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders(created_by);
