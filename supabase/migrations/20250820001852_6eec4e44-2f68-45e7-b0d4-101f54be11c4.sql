-- Performance Optimization: RLS Policy Improvements
-- Replace auth.uid() calls with (SELECT auth.uid()) for better performance

-- Optimize schedules table policies
DROP POLICY IF EXISTS "Users can view schedules" ON public.schedules;
DROP POLICY IF EXISTS "Admins and managers can manage schedules" ON public.schedules;

CREATE POLICY "Users can view schedules" ON public.schedules
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.company_id = get_user_company_id()
  )
);

CREATE POLICY "Admins and managers can manage schedules" ON public.schedules
FOR ALL USING (
  is_admin_or_manager((SELECT auth.uid()))
);

-- Optimize time_entries table policies  
DROP POLICY IF EXISTS "Users can manage their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can view team time entries" ON public.time_entries;

CREATE POLICY "Users can manage their own time entries" ON public.time_entries
FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Managers can view team time entries" ON public.time_entries
FOR SELECT USING (
  user_id = (SELECT auth.uid()) OR is_admin_or_manager((SELECT auth.uid()))
);

-- Optimize time_off_requests table policies
DROP POLICY IF EXISTS "Users can manage their own time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Managers can view and approve time off requests" ON public.time_off_requests;

CREATE POLICY "Users can manage their own time off requests" ON public.time_off_requests
FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Managers can view and approve time off requests" ON public.time_off_requests
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR is_admin_or_manager((SELECT auth.uid()))
);

-- Optimize task_comments table policies
DROP POLICY IF EXISTS "Users can manage comments on accessible tasks" ON public.task_comments;

CREATE POLICY "Users can manage comments on accessible tasks" ON public.task_comments
FOR ALL USING (
  created_by = (SELECT auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_comments.task_id 
    AND (t.created_by = (SELECT auth.uid()) OR t.assigned_to = (SELECT auth.uid()) OR is_admin_or_manager((SELECT auth.uid())))
  )
);

-- Optimize workflows table policies
DROP POLICY IF EXISTS "Company members can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "Admins can manage workflows" ON public.workflows;

CREATE POLICY "Company members can view workflows" ON public.workflows
FOR SELECT USING (
  company_id = get_user_company_id((SELECT auth.uid()))
);

CREATE POLICY "Admins can manage workflows" ON public.workflows
FOR ALL USING (
  company_id = get_user_company_id((SELECT auth.uid())) AND is_admin_or_manager((SELECT auth.uid()))
);

-- Optimize workflow_steps table policies
DROP POLICY IF EXISTS "Users can view workflow steps for accessible workflows" ON public.workflow_steps;
DROP POLICY IF EXISTS "Admins can manage workflow steps" ON public.workflow_steps;

CREATE POLICY "Users can view workflow steps for accessible workflows" ON public.workflow_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_steps.workflow_id 
    AND w.company_id = get_user_company_id((SELECT auth.uid()))
  )
);

CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_steps.workflow_id 
    AND w.company_id = get_user_company_id((SELECT auth.uid())) 
    AND is_admin_or_manager((SELECT auth.uid()))
  )
);

-- Optimize reminders table policies
DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.reminders;

CREATE POLICY "Users can manage their own reminders" ON public.reminders
FOR ALL USING (created_by = (SELECT auth.uid()));

-- Optimize purchase_orders table policies
DROP POLICY IF EXISTS "Company members can view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins and managers can manage purchase orders" ON public.purchase_orders;

CREATE POLICY "Company members can view purchase orders" ON public.purchase_orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.company_id = get_user_company_id()
  )
);

CREATE POLICY "Admins and managers can manage purchase orders" ON public.purchase_orders
FOR ALL USING (
  is_admin_or_manager((SELECT auth.uid()))
);