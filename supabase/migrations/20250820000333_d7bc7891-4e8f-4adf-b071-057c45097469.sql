-- Continue optimizing RLS policies for better performance
-- Part 2: Handle remaining tables with auth function performance issues

-- Update schedules policies
DROP POLICY IF EXISTS "Users can view their own schedules" ON public.schedules;
CREATE POLICY "Users can view their own schedules" ON public.schedules
FOR SELECT USING (employee_id = (select auth.uid()));

DROP POLICY IF EXISTS "Managers can view department schedules" ON public.schedules;
CREATE POLICY "Managers can view department schedules" ON public.schedules
FOR SELECT USING (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Managers can create schedules" ON public.schedules;
CREATE POLICY "Managers can create schedules" ON public.schedules
FOR INSERT WITH CHECK (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Users can update their own schedules" ON public.schedules;
CREATE POLICY "Users can update their own schedules" ON public.schedules
FOR UPDATE USING (
  (employee_id = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Only admins and managers can delete schedules" ON public.schedules;
CREATE POLICY "Only admins and managers can delete schedules" ON public.schedules
FOR DELETE USING (is_admin_or_manager((select auth.uid())));

-- Update time_entries policies
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
CREATE POLICY "Users can view their own time entries" ON public.time_entries
FOR SELECT USING (
  (user_id = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Managers can view department time entries" ON public.time_entries;
CREATE POLICY "Managers can view department time entries" ON public.time_entries
FOR SELECT USING (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Users can create their own time entries" ON public.time_entries;
CREATE POLICY "Users can create their own time entries" ON public.time_entries
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
CREATE POLICY "Users can update their own time entries" ON public.time_entries
FOR UPDATE USING (
  (user_id = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

-- Update time_off_requests policies
DROP POLICY IF EXISTS "Users can view their own time off requests" ON public.time_off_requests;
CREATE POLICY "Users can view their own time off requests" ON public.time_off_requests
FOR SELECT USING (
  (user_id = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Managers can view department time off requests" ON public.time_off_requests;
CREATE POLICY "Managers can view department time off requests" ON public.time_off_requests
FOR SELECT USING (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Users can create time off requests" ON public.time_off_requests;
CREATE POLICY "Users can create time off requests" ON public.time_off_requests
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own pending requests" ON public.time_off_requests;
CREATE POLICY "Users can update their own pending requests" ON public.time_off_requests
FOR UPDATE USING (
  (user_id = (select auth.uid()) AND status = 'pending') OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Managers can approve time off requests" ON public.time_off_requests;
CREATE POLICY "Managers can approve time off requests" ON public.time_off_requests
FOR UPDATE USING (is_admin_or_manager((select auth.uid())));

-- Update task_comments policies
DROP POLICY IF EXISTS "Users can view comments on tasks they can see" ON public.task_comments;
CREATE POLICY "Users can view comments on tasks they can see" ON public.task_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = task_comments.task_id 
    AND (
      (tasks.assigned_to = (select auth.uid())) OR 
      (tasks.created_by = (select auth.uid())) OR 
      is_admin_or_manager((select auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can create comments on tasks they can see" ON public.task_comments;
CREATE POLICY "Users can create comments on tasks they can see" ON public.task_comments
FOR INSERT WITH CHECK (
  (author_id = (select auth.uid())) AND 
  EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = task_comments.task_id 
    AND (
      (tasks.assigned_to = (select auth.uid())) OR 
      (tasks.created_by = (select auth.uid())) OR 
      is_admin_or_manager((select auth.uid()))
    )
  )
);

-- Update workflows policies
DROP POLICY IF EXISTS "Users can view workflows in their department" ON public.workflows;
CREATE POLICY "Users can view workflows in their department" ON public.workflows
FOR SELECT USING (
  (created_by = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Only managers can create workflows" ON public.workflows;
CREATE POLICY "Only managers can create workflows" ON public.workflows
FOR INSERT WITH CHECK (
  (created_by = (select auth.uid())) AND 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Only managers can update workflows" ON public.workflows;
CREATE POLICY "Only managers can update workflows" ON public.workflows
FOR UPDATE USING (is_admin_or_manager((select auth.uid())));

DROP POLICY IF EXISTS "Only admins can delete workflows" ON public.workflows;
CREATE POLICY "Only admins can delete workflows" ON public.workflows
FOR DELETE USING (has_role((select auth.uid()), 'admin'::user_role));

-- Update workflow_steps policies
DROP POLICY IF EXISTS "Users can view workflow steps for workflows they can see" ON public.workflow_steps;
CREATE POLICY "Users can view workflow steps for workflows they can see" ON public.workflow_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_steps.workflow_id 
    AND (
      (w.created_by = (select auth.uid())) OR 
      is_admin_or_manager((select auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Only managers can modify workflow steps" ON public.workflow_steps;
CREATE POLICY "Only managers can modify workflow steps" ON public.workflow_steps
FOR ALL USING (is_admin_or_manager((select auth.uid())));

-- Update task_workflow_instances policies
DROP POLICY IF EXISTS "Users can view workflow instances for tasks they can see" ON public.task_workflow_instances;
CREATE POLICY "Users can view workflow instances for tasks they can see" ON public.task_workflow_instances
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_workflow_instances.task_id 
    AND (
      (t.assigned_to = (select auth.uid())) OR 
      (t.created_by = (select auth.uid())) OR 
      is_admin_or_manager((select auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can update workflow instances for their tasks" ON public.task_workflow_instances;
CREATE POLICY "Users can update workflow instances for their tasks" ON public.task_workflow_instances
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_workflow_instances.task_id 
    AND (
      (t.assigned_to = (select auth.uid())) OR 
      (t.created_by = (select auth.uid())) OR 
      is_admin_or_manager((select auth.uid()))
    )
  )
);

-- Update workflow_step_instances policies
DROP POLICY IF EXISTS "Users can view step instances for workflows they can see" ON public.workflow_step_instances;
CREATE POLICY "Users can view step instances for workflows they can see" ON public.workflow_step_instances
FOR SELECT USING (
  (assigned_to = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Users can update step instances assigned to them" ON public.workflow_step_instances;
CREATE POLICY "Users can update step instances assigned to them" ON public.workflow_step_instances
FOR UPDATE USING (
  (assigned_to = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);