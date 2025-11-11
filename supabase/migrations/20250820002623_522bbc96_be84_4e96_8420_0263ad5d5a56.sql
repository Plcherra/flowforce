-- Performance Optimization: Strategic Index Creation
-- Add indexes for common query patterns and foreign keys
-- Note: CREATE INDEX CONCURRENTLY cannot be run in a transaction

-- Foreign Key Indexes for better JOIN performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_created_by ON public.schedules(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);

-- Temporal indexes for date-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_submissions_submitted_at ON public.form_submissions(submitted_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_start_time ON public.schedules(start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_end_time ON public.schedules(end_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_remind_at ON public.reminders(remind_at);

-- Status-based filtering indexes with covering columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_status_covering ON public.schedules(status, start_time, end_time) WHERE status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_status_covering ON public.inventory_items(status, current_stock, min_stock_level) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_status_covering ON public.forms(status, created_at, created_by) WHERE status = 'published';

-- Partial indexes for common filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_published ON public.schedules(start_time, end_time) WHERE is_published = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock ON public.inventory_items(name, current_stock, min_stock_level) WHERE current_stock <= min_stock_level;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_pending ON public.reminders(remind_at, user_id) WHERE completed = false;

-- Channel message search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_created ON public.messages(channel_id, created_at DESC);

-- User activity indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_company_role ON public.profiles(company_id, role) WHERE company_id IS NOT NULL;

-- Performance monitoring: Add index to track user sessions and activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_active ON public.profiles(email) WHERE employment_status = 'active';