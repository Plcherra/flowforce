-- Fix Performance Advisor warnings with indexes and optimizations
-- Note: Using regular CREATE INDEX instead of CONCURRENTLY due to transaction limitations

-- Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);

CREATE INDEX IF NOT EXISTS idx_company_roles_company_id ON public.company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_company_roles_is_active ON public.company_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);
CREATE INDEX IF NOT EXISTS idx_company_invites_status ON public.company_invites(status);
CREATE INDEX IF NOT EXISTS idx_company_invites_token ON public.company_invites(invite_token);

CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);

CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_status ON public.forms(status);
CREATE INDEX IF NOT EXISTS idx_forms_department_id ON public.forms(department_id);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_by ON public.form_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON public.form_submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_order ON public.form_fields(field_order);

CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON public.schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_schedules_end_time ON public.schedules(end_time);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_department_id ON public.schedules(department_id);

CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_recipient_id ON public.payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by ON public.inventory_items(created_by);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON public.inventory_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON public.custom_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_reports_is_public ON public.custom_reports(is_public);

CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON public.positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_role_id ON public.positions(role_id);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_company_role ON public.profiles(company_id, role);
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON public.schedules(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_date ON public.form_submissions(form_id, submitted_at DESC);

-- Optimize analytics cache table
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON public.analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON public.analytics_cache(expires_at);

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_profiles_active_company ON public.profiles(company_id) WHERE employment_status = 'active';
CREATE INDEX IF NOT EXISTS idx_forms_published ON public.forms(created_by) WHERE status = 'published';
-- Note: Removed idx_schedules_future index because now() is not IMMUTABLE and cannot be used in index predicates
-- Consider creating this index manually after migration if needed, or use a different approach