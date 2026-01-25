-- Phase 4: Performance Optimization - Critical Database Indexes
-- Date: January 22, 2026
-- Priority: P0 (Critical for performance)
-- Note: Removed CONCURRENTLY to allow running in transaction block
-- For production, consider creating indexes CONCURRENTLY during maintenance window

-- 1. Profiles: Company + Status lookups for employees and analytics
CREATE INDEX IF NOT EXISTS profiles_company_status_idx
  ON public.profiles (company_id, employment_status)
  WHERE company_id IS NOT NULL;

-- 2. Schedules: Company + Start time for weekly schedule windows
CREATE INDEX IF NOT EXISTS schedules_company_start_idx
  ON public.schedules (company_id, start_time)
  WHERE company_id IS NOT NULL;

-- 3. Schedule Assignments: Schedule ID for joins
CREATE INDEX IF NOT EXISTS schedule_assignments_schedule_idx
  ON public.schedule_assignments (schedule_id);

-- 4. Time Off Requests: User + Created date for user-centric history
CREATE INDEX IF NOT EXISTS time_off_requests_user_created_idx
  ON public.time_off_requests (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- 5. User Unavailability: User + Start time for availability ranges
CREATE INDEX IF NOT EXISTS user_unavailability_user_start_idx
  ON public.user_unavailability (user_id, start_time)
  WHERE user_id IS NOT NULL;

-- 6. Tasks: Company + Status + Due date for task queries
CREATE INDEX IF NOT EXISTS tasks_company_status_due_idx
  ON public.tasks (company_id, status, due_date)
  WHERE company_id IS NOT NULL;

-- 7. Messages: Channel + Created date for chronological fetches
CREATE INDEX IF NOT EXISTS messages_channel_created_idx
  ON public.messages (channel_id, created_at DESC)
  WHERE channel_id IS NOT NULL;

-- 8. Payments: Created by + Created + Status for finance dashboards
-- Note: payments table doesn't have company_id, filtered via created_by -> profiles.company_id
CREATE INDEX IF NOT EXISTS payments_created_by_created_status_idx
  ON public.payments (created_by, created_at DESC, status)
  WHERE created_by IS NOT NULL;

-- 9. Inventory Transactions: Performed by + Created for manager metrics
-- Note: inventory_transactions table doesn't have company_id, filtered via performed_by -> profiles.company_id
CREATE INDEX IF NOT EXISTS inventory_transactions_performed_by_created_idx
  ON public.inventory_transactions (performed_by, created_at DESC)
  WHERE performed_by IS NOT NULL;

-- 10. Employee Report: Employee + Date for 30-day sentiment reads
CREATE INDEX IF NOT EXISTS employee_report_employee_date_idx
  ON public.employee_report (employee_id, date)
  WHERE employee_id IS NOT NULL;

-- Comments for documentation
COMMENT ON INDEX profiles_company_status_idx IS 'P0: Accelerates tenant-scoped employee queries and analytics';
COMMENT ON INDEX schedules_company_start_idx IS 'P0: Optimizes weekly schedule window queries';
COMMENT ON INDEX schedule_assignments_schedule_idx IS 'P0: Speeds up schedule assignment joins';
COMMENT ON INDEX time_off_requests_user_created_idx IS 'P0: Backs user-centric time-off history queries';
COMMENT ON INDEX user_unavailability_user_start_idx IS 'P0: Optimizes availability range queries';
COMMENT ON INDEX tasks_company_status_due_idx IS 'P0: Accelerates task queries by company, status, and due date';
COMMENT ON INDEX messages_channel_created_idx IS 'P1: Speeds up chronological message fetches';
COMMENT ON INDEX payments_created_by_created_status_idx IS 'P1: Optimizes finance dashboard queries (filtered via created_by -> profiles.company_id)';
COMMENT ON INDEX inventory_transactions_performed_by_created_idx IS 'P1: Accelerates inventory manager metrics (filtered via performed_by -> profiles.company_id)';
COMMENT ON INDEX employee_report_employee_date_idx IS 'P1: Supports 30-day employee sentiment reads';
