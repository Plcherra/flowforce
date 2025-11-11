
-- Step 1: Add indexes on columns frequently used in RLS policy filters
-- These indexes will significantly improve RLS policy evaluation performance

-- Role-based indexes for faster role checking
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_company_roles_is_active ON public.company_roles(is_active);

-- Status-based indexes for faster status filtering
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON public.profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON public.time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_forms_status ON public.forms(status);

-- Company admin flag index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_profiles_is_company_admin ON public.profiles(is_company_admin) WHERE is_company_admin = true;

-- Auth user ID indexes for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Date-based indexes for time-sensitive policies
CREATE INDEX IF NOT EXISTS idx_company_invites_expires_at ON public.company_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_start_date ON public.time_off_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_end_date ON public.time_off_requests(end_date);

-- Composite indexes for complex policy conditions
CREATE INDEX IF NOT EXISTS idx_profiles_company_role ON public.profiles(company_id, role);
CREATE INDEX IF NOT EXISTS idx_company_invites_email_status ON public.company_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_schedules_user_status ON public.schedules(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status);
