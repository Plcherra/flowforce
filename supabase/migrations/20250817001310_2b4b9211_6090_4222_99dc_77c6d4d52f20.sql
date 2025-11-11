-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  target_completion_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  reward_type TEXT CHECK (reward_type IN ('recognition', 'bonus', 'badge', 'time_off', 'custom')),
  reward_details JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal milestones table
CREATE TABLE public.goal_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal tasks table to link tasks to goals
CREATE TABLE public.goal_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES goal_milestones(id) ON DELETE SET NULL,
  weight INTEGER NOT NULL DEFAULT 1, -- How much this task contributes to goal progress
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(goal_id, task_id)
);

-- Create goal participants table
CREATE TABLE public.goal_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'observer')),
  contribution_score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(goal_id, user_id)
);

-- Create goal rewards table
CREATE TABLE public.goal_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reward_type TEXT NOT NULL,
  reward_details JSONB NOT NULL DEFAULT '{}',
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goals
CREATE POLICY "Users can view goals in their company" ON public.goals
  FOR SELECT USING (
    company_id = get_user_company_id() OR 
    EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = goals.id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create goals for their company" ON public.goals
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND company_id = get_user_company_id()
  );

CREATE POLICY "Goal creators and admins can update goals" ON public.goals
  FOR UPDATE USING (
    created_by = auth.uid() OR is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Goal creators and admins can delete goals" ON public.goals
  FOR DELETE USING (
    created_by = auth.uid() OR is_admin_or_manager(auth.uid())
  );

-- Create RLS policies for goal milestones
CREATE POLICY "Users can view milestones for accessible goals" ON public.goal_milestones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM goals WHERE id = goal_milestones.goal_id AND (
      company_id = get_user_company_id() OR 
      EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = goals.id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Goal participants can manage milestones" ON public.goal_milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_milestones.goal_id AND (
      g.created_by = auth.uid() OR 
      is_admin_or_manager(auth.uid()) OR
      EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = g.id AND user_id = auth.uid() AND role IN ('owner', 'participant'))
    ))
  );

-- Create RLS policies for goal tasks
CREATE POLICY "Users can view goal tasks for accessible goals" ON public.goal_tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM goals WHERE id = goal_tasks.goal_id AND (
      company_id = get_user_company_id() OR 
      EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = goals.id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Goal participants can manage goal tasks" ON public.goal_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_tasks.goal_id AND (
      g.created_by = auth.uid() OR 
      is_admin_or_manager(auth.uid()) OR
      EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = g.id AND user_id = auth.uid() AND role IN ('owner', 'participant'))
    ))
  );

-- Create RLS policies for goal participants
CREATE POLICY "Users can view participants for accessible goals" ON public.goal_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM goals WHERE id = goal_participants.goal_id AND (
      company_id = get_user_company_id() OR 
      EXISTS (SELECT 1 FROM goal_participants gp2 WHERE gp2.goal_id = goals.id AND gp2.user_id = auth.uid())
    ))
  );

CREATE POLICY "Goal creators and admins can manage participants" ON public.goal_participants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_participants.goal_id AND (
      g.created_by = auth.uid() OR is_admin_or_manager(auth.uid())
    ))
  );

-- Create RLS policies for goal rewards
CREATE POLICY "Users can view rewards for accessible goals" ON public.goal_rewards
  FOR SELECT USING (
    user_id = auth.uid() OR
    created_by = auth.uid() OR
    is_admin_or_manager(auth.uid()) OR
    EXISTS (SELECT 1 FROM goals WHERE id = goal_rewards.goal_id AND (
      company_id = get_user_company_id() OR 
      EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = goals.id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Goal creators and admins can manage rewards" ON public.goal_rewards
  FOR ALL USING (
    created_by = auth.uid() OR
    is_admin_or_manager(auth.uid()) OR
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_rewards.goal_id AND g.created_by = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX idx_goals_company_id ON goals(company_id);
CREATE INDEX idx_goals_created_by ON goals(created_by);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX idx_goal_tasks_goal_id ON goal_tasks(goal_id);
CREATE INDEX idx_goal_tasks_task_id ON goal_tasks(task_id);
CREATE INDEX idx_goal_participants_goal_id ON goal_participants(goal_id);
CREATE INDEX idx_goal_participants_user_id ON goal_participants(user_id);
CREATE INDEX idx_goal_rewards_goal_id ON goal_rewards(goal_id);
CREATE INDEX idx_goal_rewards_user_id ON goal_rewards(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_goal_milestones_updated_at
  BEFORE UPDATE ON goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();