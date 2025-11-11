
-- Create enum types for schedule and time tracking
CREATE TYPE public.schedule_type AS ENUM ('shift', 'meeting', 'task', 'break', 'time_off');
CREATE TYPE public.schedule_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.time_entry_type AS ENUM ('clock_in', 'clock_out', 'break_start', 'break_end');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create schedules table
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id),
  title TEXT NOT NULL,
  description TEXT,
  schedule_type schedule_type NOT NULL DEFAULT 'shift',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  status schedule_status NOT NULL DEFAULT 'scheduled',
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB, -- stores pattern like {"frequency": "weekly", "days": ["monday", "tuesday"]}
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create time entries table for clock in/out tracking
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.schedules(id),
  entry_type time_entry_type NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time off requests table
CREATE TABLE public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'vacation', -- vacation, sick, personal, etc.
  status approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable Row Level Security
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedules
CREATE POLICY "Users can view their own schedules" ON public.schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view department schedules" ON public.schedules
  FOR SELECT USING (
    public.is_admin_or_manager(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND department_id = schedules.department_id 
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers can create schedules" ON public.schedules
  FOR INSERT WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can update their own schedules" ON public.schedules
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins and managers can delete schedules" ON public.schedules
  FOR DELETE USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own time entries" ON public.time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view department time entries" ON public.time_entries
  FOR SELECT USING (
    public.is_admin_or_manager(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.department_id = p2.department_id
      WHERE p1.id = auth.uid() AND p1.role = 'manager' AND p2.id = time_entries.user_id
    )
  );

CREATE POLICY "Users can create their own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" ON public.time_entries
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_manager(auth.uid()));

-- RLS Policies for time_off_requests
CREATE POLICY "Users can view their own time off requests" ON public.time_off_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view department time off requests" ON public.time_off_requests
  FOR SELECT USING (
    public.is_admin_or_manager(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.department_id = p2.department_id
      WHERE p1.id = auth.uid() AND p1.role = 'manager' AND p2.id = time_off_requests.user_id
    )
  );

CREATE POLICY "Users can create time off requests" ON public.time_off_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests" ON public.time_off_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Managers can approve time off requests" ON public.time_off_requests
  FOR UPDATE USING (public.is_admin_or_manager(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_time_off_requests_updated_at
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX idx_schedules_start_time ON public.schedules(start_time);
CREATE INDEX idx_schedules_department_id ON public.schedules(department_id);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_timestamp ON public.time_entries(timestamp);
CREATE INDEX idx_time_off_requests_user_id ON public.time_off_requests(user_id);
CREATE INDEX idx_time_off_requests_status ON public.time_off_requests(status);
