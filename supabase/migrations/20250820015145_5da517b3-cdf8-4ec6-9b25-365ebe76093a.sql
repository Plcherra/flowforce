-- Create shift_assignments table if it doesn't exist with proper relationships
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for shift_assignments
CREATE POLICY "Users can view shift assignments in their company" 
ON public.shift_assignments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.user_id = shift_assignments.user_id
    )
  )
);

CREATE POLICY "Users can create shift assignments in their company" 
ON public.shift_assignments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.user_id = shift_assignments.user_id
    )
  )
);

CREATE POLICY "Users can update shift assignments in their company" 
ON public.shift_assignments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.user_id = shift_assignments.user_id
    )
  )
);

CREATE POLICY "Users can delete shift assignments in their company" 
ON public.shift_assignments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.user_id = shift_assignments.user_id
    )
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shift_assignments_schedule_id ON public.shift_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_user_id ON public.shift_assignments(user_id);

-- Create schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  color TEXT,
  status TEXT DEFAULT 'scheduled',
  is_published BOOLEAN DEFAULT false,
  required_headcount INTEGER DEFAULT 1,
  location TEXT,
  notes TEXT,
  position_id UUID REFERENCES positions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for schedules
CREATE POLICY "Users can view schedules in their company" 
ON public.schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = schedules.company_id
  )
);

CREATE POLICY "Users can create schedules in their company" 
ON public.schedules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = schedules.company_id
  )
);

CREATE POLICY "Users can update schedules in their company" 
ON public.schedules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = schedules.company_id
  )
);

CREATE POLICY "Users can delete schedules in their company" 
ON public.schedules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = schedules.company_id
  )
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_assignments_updated_at
  BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();