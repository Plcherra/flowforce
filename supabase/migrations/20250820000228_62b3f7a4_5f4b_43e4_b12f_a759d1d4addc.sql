-- Optimize RLS policies to prevent unnecessary re-evaluation of auth functions
-- Replace auth.uid() with (select auth.uid()) for better performance

-- Update company_settings policies (only if company_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'company_id'
  ) THEN
    DROP POLICY IF EXISTS "settings: update where owner" ON public.company_settings;
    CREATE POLICY "settings: update where owner" ON public.company_settings  
    FOR UPDATE USING (                                                       
      EXISTS (                                                               
        SELECT 1 FROM companies c                                            
        WHERE c.id = company_settings.company_id                             
        AND c.owner_id = (select auth.uid())                                 
      )                                                                      
    ) WITH CHECK (                                                           
      EXISTS (                                                               
        SELECT 1 FROM companies c                                            
        WHERE c.id = company_settings.company_id                             
        AND c.owner_id = (select auth.uid())                                 
      )                                                                      
    );
  END IF;
END $$;

-- Only create admin policy if has_role function exists with correct signature
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'has_role'
  ) THEN
    DROP POLICY IF EXISTS "Only admins can update company settings" ON public.company_settings;
    BEGIN
      EXECUTE 'CREATE POLICY "Only admins can update company settings" ON public.company_settings
      FOR UPDATE USING (has_role((select auth.uid()), ''admin''::text))';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        EXECUTE 'CREATE POLICY "Only admins can update company settings" ON public.company_settings
        FOR UPDATE USING (has_role((select auth.uid()), ''admin''::user_role))';
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END;
  END IF;
END $$;

-- Update goals policies
DROP POLICY IF EXISTS "Users can view goals in their company" ON public.goals;
CREATE POLICY "Users can view goals in their company" ON public.goals
FOR SELECT USING (
  (company_id = get_user_company_id((select auth.uid()))) OR 
  (EXISTS (
    SELECT 1 FROM goal_participants 
    WHERE goal_participants.goal_id = goals.id 
    AND goal_participants.user_id = (select auth.uid())
  ))
);

DROP POLICY IF EXISTS "Users can create goals for their company" ON public.goals;
CREATE POLICY "Users can create goals for their company" ON public.goals
FOR INSERT WITH CHECK (
  (created_by = (select auth.uid())) AND 
  (company_id = get_user_company_id((select auth.uid())))
);

DROP POLICY IF EXISTS "Goal creators and admins can update goals" ON public.goals;
CREATE POLICY "Goal creators and admins can update goals" ON public.goals
FOR UPDATE USING (
  (created_by = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Goal creators and admins can delete goals" ON public.goals;
CREATE POLICY "Goal creators and admins can delete goals" ON public.goals
FOR DELETE USING (
  (created_by = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

-- Update message_channels policies
DROP POLICY IF EXISTS "Channel creators and admins can update channels" ON public.message_channels;
CREATE POLICY "Channel creators and admins can update channels" ON public.message_channels
FOR UPDATE USING (
  ((select auth.uid()) = created_by) OR 
  is_admin_or_manager((select auth.uid()))
);

-- Only create admin delete policy if has_role function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'has_role'
  ) THEN
    DROP POLICY IF EXISTS "Only admins can delete channels" ON public.message_channels;
    -- Try with text first, then user_role if that fails
    BEGIN
      EXECUTE 'CREATE POLICY "Only admins can delete channels" ON public.message_channels
      FOR DELETE USING (has_role((select auth.uid()), ''admin''::text))';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        EXECUTE 'CREATE POLICY "Only admins can delete channels" ON public.message_channels
        FOR DELETE USING (has_role((select auth.uid()), ''admin''::user_role))';
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view channels they are members of" ON public.message_channels;
CREATE POLICY "Users can view channels they are members of" ON public.message_channels
FOR SELECT USING (
  (EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_members.channel_id = message_channels.id 
    AND channel_members.user_id = (select auth.uid())
  )) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Users can create channels" ON public.message_channels;
CREATE POLICY "Users can create channels" ON public.message_channels
FOR INSERT WITH CHECK ((select auth.uid()) = created_by);

-- Update companies policies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT USING (
  (created_by = (select auth.uid())) OR 
  (owner_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Company owners can update their company" ON public.companies;
CREATE POLICY "Company owners can update their company" ON public.companies
FOR UPDATE USING (owner_id = (select auth.uid()))
WITH CHECK (owner_id = (select auth.uid()));

-- Update channel_members policies
DROP POLICY IF EXISTS "Users can join public channels or channels they created" ON public.channel_members;
CREATE POLICY "Users can join public channels or channels they created" ON public.channel_members
FOR INSERT WITH CHECK (
  (user_id = (select auth.uid())) AND 
  can_access_channel_members(channel_id, (select auth.uid()))
);

-- Update tasks policies
DROP POLICY IF EXISTS "Users can view tasks assigned to them or in their department" ON public.tasks;
CREATE POLICY "Users can view tasks assigned to them or in their department" ON public.tasks
FOR SELECT USING (
  (assigned_to = (select auth.uid())) OR 
  (created_by = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks" ON public.tasks
FOR INSERT WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
CREATE POLICY "Users can update tasks they created or are assigned to" ON public.tasks
FOR UPDATE USING (
  (created_by = (select auth.uid())) OR 
  (assigned_to = (select auth.uid())) OR 
  is_admin_or_manager((select auth.uid()))
);

-- Only create admin delete tasks policy if has_role function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'has_role'
  ) THEN
    DROP POLICY IF EXISTS "Only creators and admins can delete tasks" ON public.tasks;
    BEGIN
      EXECUTE 'CREATE POLICY "Only creators and admins can delete tasks" ON public.tasks
      FOR DELETE USING (
        (created_by = (select auth.uid())) OR 
        has_role((select auth.uid()), ''admin''::text)
      )';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        EXECUTE 'CREATE POLICY "Only creators and admins can delete tasks" ON public.tasks
        FOR DELETE USING (
          (created_by = (select auth.uid())) OR 
          has_role((select auth.uid()), ''admin''::user_role)
        )';
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END;
  END IF;
END $$;

-- Update messages policies
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING ((select auth.uid()) = sender_id);