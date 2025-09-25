-- Drop all existing policies for goal_participants to start fresh
DROP POLICY IF EXISTS "Goal creators and admins can manage participants" ON public.goal_participants;
DROP POLICY IF EXISTS "Users can view participants in company goals" ON public.goal_participants;

-- Create clean policies without recursion
CREATE POLICY "Goal creators and admins can manage participants" 
ON public.goal_participants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM goals g 
    WHERE g.id = goal_participants.goal_id 
    AND (g.created_by = auth.uid() OR is_admin_or_manager(auth.uid()))
  )
);

CREATE POLICY "Users can view participants in company goals" 
ON public.goal_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM goals g 
    WHERE g.id = goal_participants.goal_id 
    AND g.company_id = get_user_company_id()
  )
);