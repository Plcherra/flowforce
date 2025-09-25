-- Fix remaining RLS policies with correct column references
-- Only update policies for tables we have confirmed structure for

-- Update task_comments policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_comments') THEN
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
  END IF;
END $$;

-- Update workflows policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflows') THEN
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
  END IF;
END $$;

-- Update workflow_steps policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_steps') THEN
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
  END IF;
END $$;