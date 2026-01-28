
-- Create enum types for task management
DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_step_type AS ENUM ('approval', 'assignment', 'review', 'notification');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  department_id UUID REFERENCES public.departments(id),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  parent_task_id UUID REFERENCES public.tasks(id),
  workflow_id UUID, -- will reference workflows table
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create task comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status workflow_status NOT NULL DEFAULT 'active',
  department_id UUID REFERENCES public.departments(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  is_template BOOLEAN DEFAULT false,
  trigger_conditions JSONB DEFAULT '{}'::jsonb, -- conditions that trigger this workflow
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow steps table
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  step_type workflow_step_type NOT NULL,
  assigned_role public.user_role,
  assigned_user_id UUID REFERENCES public.profiles(id),
  auto_assign BOOLEAN DEFAULT false,
  required BOOLEAN DEFAULT true,
  estimated_duration INTERVAL,
  conditions JSONB DEFAULT '{}'::jsonb, -- conditions for this step
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, step_number)
);

-- Add foreign key for workflow_id in tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_tasks_workflow'
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_workflow 
      FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);
  END IF;
END $$;

-- Create task workflow instances table (tracks workflow progress for specific tasks)
CREATE TABLE IF NOT EXISTS public.task_workflow_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id),
  current_step_id UUID REFERENCES public.workflow_steps(id),
  status workflow_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow step instances table (tracks individual step progress)
CREATE TABLE IF NOT EXISTS public.workflow_step_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_instance_id UUID NOT NULL REFERENCES public.task_workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id),
  assigned_to UUID REFERENCES public.profiles(id),
  status task_status NOT NULL DEFAULT 'todo',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
DROP POLICY IF EXISTS "Users can view tasks assigned to them or in their department" ON public.tasks;
CREATE POLICY "Users can view tasks assigned to them or in their department" ON public.tasks
  FOR SELECT USING (
    auth.uid() = assigned_to OR 
    auth.uid() = created_by OR
    public.is_admin_or_manager(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND department_id = tasks.department_id
    )
  );

DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
CREATE POLICY "Users can update tasks they created or are assigned to" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to OR 
    public.is_admin_or_manager(auth.uid())
  );

DROP POLICY IF EXISTS "Only creators and admins can delete tasks" ON public.tasks;
CREATE POLICY "Only creators and admins can delete tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() = created_by OR 
    public.is_admin_or_manager(auth.uid())
  );

-- RLS Policies for task comments
DROP POLICY IF EXISTS "Users can view comments on tasks they can see" ON public.task_comments;
CREATE POLICY "Users can view comments on tasks they can see" ON public.task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_comments.task_id 
      AND (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        public.is_admin_or_manager(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND department_id = tasks.department_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can create comments on tasks they can see" ON public.task_comments;
CREATE POLICY "Users can create comments on tasks they can see" ON public.task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_comments.task_id 
      AND (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        public.is_admin_or_manager(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND department_id = tasks.department_id
        )
      )
    )
  );

-- RLS Policies for workflows
DROP POLICY IF EXISTS "Users can view workflows in their department" ON public.workflows;
CREATE POLICY "Users can view workflows in their department" ON public.workflows
  FOR SELECT USING (
    public.is_admin_or_manager(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND department_id = workflows.department_id
    )
  );

DROP POLICY IF EXISTS "Only managers can create workflows" ON public.workflows;
CREATE POLICY "Only managers can create workflows" ON public.workflows
  FOR INSERT WITH CHECK (public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Only managers can update workflows" ON public.workflows;
CREATE POLICY "Only managers can update workflows" ON public.workflows
  FOR UPDATE USING (public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete workflows" ON public.workflows;
CREATE POLICY "Only admins can delete workflows" ON public.workflows
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for workflow steps
DROP POLICY IF EXISTS "Users can view workflow steps for workflows they can see" ON public.workflow_steps;
CREATE POLICY "Users can view workflow steps for workflows they can see" ON public.workflow_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE id = workflow_steps.workflow_id 
      AND (
        public.is_admin_or_manager(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND department_id = workflows.department_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Only managers can modify workflow steps" ON public.workflow_steps;
CREATE POLICY "Only managers can modify workflow steps" ON public.workflow_steps
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for workflow instances
DROP POLICY IF EXISTS "Users can view workflow instances for tasks they can see" ON public.task_workflow_instances;
CREATE POLICY "Users can view workflow instances for tasks they can see" ON public.task_workflow_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_workflow_instances.task_id 
      AND (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        public.is_admin_or_manager(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND department_id = tasks.department_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "System can create workflow instances" ON public.task_workflow_instances;
CREATE POLICY "System can create workflow instances" ON public.task_workflow_instances
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update workflow instances for their tasks" ON public.task_workflow_instances;
CREATE POLICY "Users can update workflow instances for their tasks" ON public.task_workflow_instances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_workflow_instances.task_id 
      AND (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        public.is_admin_or_manager(auth.uid())
      )
    )
  );

-- RLS Policies for workflow step instances
DROP POLICY IF EXISTS "Users can view step instances for workflows they can see" ON public.workflow_step_instances;
CREATE POLICY "Users can view step instances for workflows they can see" ON public.workflow_step_instances
  FOR SELECT USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.task_workflow_instances twi
      JOIN public.tasks t ON t.id = twi.task_id
      WHERE twi.id = workflow_step_instances.workflow_instance_id
      AND (
        auth.uid() = t.assigned_to OR 
        auth.uid() = t.created_by OR
        public.is_admin_or_manager(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND department_id = t.department_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update step instances assigned to them" ON public.workflow_step_instances;
CREATE POLICY "Users can update step instances assigned to them" ON public.workflow_step_instances
  FOR UPDATE USING (auth.uid() = assigned_to OR public.is_admin_or_manager(auth.uid()));

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_workflow_steps_updated_at ON public.workflow_steps;
CREATE TRIGGER update_workflow_steps_updated_at
  BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_task_workflow_instances_updated_at ON public.task_workflow_instances;
CREATE TRIGGER update_task_workflow_instances_updated_at
  BEFORE UPDATE ON public.task_workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_workflow_step_instances_updated_at ON public.workflow_step_instances;
CREATE TRIGGER update_workflow_step_instances_updated_at
  BEFORE UPDATE ON public.workflow_step_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_workflows_department_id ON public.workflows(department_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_task_workflow_instances_task_id ON public.task_workflow_instances(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_assigned_to ON public.workflow_step_instances(assigned_to);
