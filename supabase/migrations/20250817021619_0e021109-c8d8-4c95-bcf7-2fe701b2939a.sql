-- Remove the problematic policies completely and recreate with simple, non-recursive logic
DROP POLICY IF EXISTS "Goal creators and admins can manage participants" ON public.goal_participants;
DROP POLICY IF EXISTS "Users can view participants in company goals" ON public.goal_participants;

-- Create simplified policies that don't cause recursion
CREATE POLICY "Company members can view goal participants" 
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

CREATE POLICY "Goal creators can manage participants" 
ON public.goal_participants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM goals g 
    WHERE g.id = goal_participants.goal_id 
    AND (g.created_by = auth.uid() OR is_company_admin())
  )
);