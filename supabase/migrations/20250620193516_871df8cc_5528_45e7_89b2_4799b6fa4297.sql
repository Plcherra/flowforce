
-- Add new columns to schedules table for enhanced scheduling features
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS job_position_id UUID REFERENCES public.positions(id);
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS can_claim BOOLEAN DEFAULT false;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS assigned_users UUID[] DEFAULT '{}';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS required_headcount INTEGER DEFAULT 1;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0;

-- Create shift templates table
CREATE TABLE public.shift_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  job_position_id UUID REFERENCES public.positions(id),
  duration_hours NUMERIC NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  default_notes TEXT,
  tasks JSONB DEFAULT '[]',
  required_headcount INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create week templates table
CREATE TABLE public.week_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- stores the week's shift configuration
  created_by UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shift assignments table for many-to-many relationship
CREATE TABLE public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'declined', 'completed')),
  UNIQUE(schedule_id, user_id)
);

-- Create unavailability table
CREATE TABLE public.user_unavailability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_unavailability_time_range CHECK (end_time > start_time)
);

-- Enable RLS on new tables
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unavailability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_templates
CREATE POLICY "Users can view company shift templates" ON public.shift_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND company_id = shift_templates.company_id
    )
  );

CREATE POLICY "Managers can create shift templates" ON public.shift_templates
  FOR INSERT WITH CHECK (
    public.is_admin_or_manager(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND company_id = shift_templates.company_id
    )
  );

CREATE POLICY "Managers can update shift templates" ON public.shift_templates
  FOR UPDATE USING (
    public.is_admin_or_manager(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND company_id = shift_templates.company_id
    )
  );

-- RLS Policies for week_templates
CREATE POLICY "Users can view company week templates" ON public.week_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND company_id = week_templates.company_id
    )
  );

CREATE POLICY "Managers can manage week templates" ON public.week_templates
  FOR ALL USING (
    public.is_admin_or_manager(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND company_id = week_templates.company_id
    )
  );

-- RLS Policies for shift_assignments
CREATE POLICY "Users can view their shift assignments" ON public.shift_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all shift assignments" ON public.shift_assignments
  FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can manage shift assignments" ON public.shift_assignments
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for user_unavailability
CREATE POLICY "Users can view their own unavailability" ON public.user_unavailability
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view team unavailability" ON public.user_unavailability
  FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can create their own unavailability" ON public.user_unavailability
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unavailability" ON public.user_unavailability
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Managers can manage all unavailability" ON public.user_unavailability
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_week_templates_updated_at
  BEFORE UPDATE ON public.week_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_unavailability_updated_at
  BEFORE UPDATE ON public.user_unavailability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_shift_templates_company_id ON public.shift_templates(company_id);
CREATE INDEX idx_week_templates_company_id ON public.week_templates(company_id);
CREATE INDEX idx_shift_assignments_schedule_id ON public.shift_assignments(schedule_id);
CREATE INDEX idx_shift_assignments_user_id ON public.shift_assignments(user_id);
CREATE INDEX idx_user_unavailability_user_id ON public.user_unavailability(user_id);
CREATE INDEX idx_user_unavailability_time_range ON public.user_unavailability(start_time, end_time);
CREATE INDEX idx_schedules_job_position_id ON public.schedules(job_position_id);
CREATE INDEX idx_schedules_is_published ON public.schedules(is_published);
