-- Additional performance optimizations to address remaining warnings
-- Focus on missing indexes for foreign key relationships and complex queries

-- Add indexes for all foreign key relationships that might be missing
CREATE INDEX IF NOT EXISTS idx_profiles_position_id ON public.profiles(position_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id_order ON public.form_fields(form_id, field_order);
CREATE INDEX IF NOT EXISTS idx_form_submission_files_submission_field ON public.form_submission_files(submission_id, field_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_user ON public.message_reactions(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_payment_status ON public.payment_approvals(payment_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_item ON public.purchase_order_items(po_id, item_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_permission ON public.role_permissions(role_id, permission_key);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_schedule_user ON public.shift_assignments(schedule_id, user_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_company_created ON public.shift_templates(company_id, created_by);

-- Add indexes for JSON/JSONB queries that are commonly slow
CREATE INDEX IF NOT EXISTS idx_companies_enabled_sections_gin ON public.companies USING GIN(enabled_sections);
CREATE INDEX IF NOT EXISTS idx_companies_custom_roles_gin ON public.companies USING GIN(custom_roles);
CREATE INDEX IF NOT EXISTS idx_companies_positions_gin ON public.companies USING GIN(positions);
CREATE INDEX IF NOT EXISTS idx_companies_template_config_gin ON public.companies USING GIN(template_config);
CREATE INDEX IF NOT EXISTS idx_schedules_tasks_gin ON public.schedules USING GIN(tasks);
CREATE INDEX IF NOT EXISTS idx_schedules_attachments_gin ON public.schedules USING GIN(attachments);
CREATE INDEX IF NOT EXISTS idx_messages_attachments_gin ON public.messages USING GIN(attachments);
CREATE INDEX IF NOT EXISTS idx_payments_attachments_gin ON public.payments USING GIN(attachments);

-- Add text search indexes for commonly searched text fields
CREATE INDEX IF NOT EXISTS idx_companies_name_text ON public.companies USING GIN(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_profiles_name_text ON public.profiles USING GIN(to_tsvector('english', first_name || ' ' || last_name));
CREATE INDEX IF NOT EXISTS idx_forms_title_text ON public.forms USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_messages_content_text ON public.messages USING GIN(to_tsvector('english', content));

-- Add covering indexes for common SELECT patterns
CREATE INDEX IF NOT EXISTS idx_profiles_company_status_covering ON public.profiles(company_id, employment_status) INCLUDE (first_name, last_name, email, role);
CREATE INDEX IF NOT EXISTS idx_schedules_user_status_covering ON public.schedules(user_id, status) INCLUDE (title, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_forms_creator_status_covering ON public.forms(created_by, status) INCLUDE (title, created_at, updated_at);

-- Add indexes for date range queries that are typically slow
CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON public.schedules(start_time, end_time) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_expenses_date_range ON public.expenses(expense_date, created_at) WHERE status != 'rejected';
CREATE INDEX IF NOT EXISTS idx_payments_date_range ON public.payments(due_date, created_at) WHERE status != 'cancelled';

-- Add indexes for commonly filtered enum values
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, employment_status);
CREATE INDEX IF NOT EXISTS idx_schedules_type_status ON public.schedules(schedule_type, status);
CREATE INDEX IF NOT EXISTS idx_form_fields_type_required ON public.form_fields(field_type, is_required);

-- Optimize analytics and reporting queries
-- Note: Removed idx_analytics_cache_key_expires index because now() is not IMMUTABLE and cannot be used in index predicates
-- Consider creating this index manually after migration if needed, or use a different approach

-- Add unique constraint indexes that might be missing
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_invites_email_company_unique ON public.company_invites(email, company_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_employee_id_company_unique ON public.profiles(employee_id, company_id) WHERE employee_id IS NOT NULL;