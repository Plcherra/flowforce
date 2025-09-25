-- Fix infinite recursion in goal_participants RLS policies
DROP POLICY IF EXISTS "Users can view participants for accessible goals" ON public.goal_participants;

-- Create a simpler policy without self-reference
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

-- Fix section_templates access
ALTER TABLE public.section_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates" 
ON public.section_templates 
FOR SELECT 
USING (auth.role() = 'authenticated');