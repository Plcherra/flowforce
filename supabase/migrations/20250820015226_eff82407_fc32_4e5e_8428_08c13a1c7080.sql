-- First, let's create the tables with correct relationships to the profiles table
-- The profiles table uses 'id' column, not 'user_id'

-- Create shift_assignments table with proper foreign key to profiles
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies using the correct column names
CREATE POLICY "Users can view shift assignments in their company" 
ON public.shift_assignments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.id = shift_assignments.user_id
    )
  )
);

CREATE POLICY "Users can create shift assignments in their company" 
ON public.shift_assignments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.id = shift_assignments.user_id
    )
  )
);

CREATE POLICY "Users can update shift assignments in their company" 
ON public.shift_assignments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.id = shift_assignments.user_id
    )
  )
);

CREATE POLICY "Users can delete shift assignments in their company" 
ON public.shift_assignments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id IN (
      SELECT p2.company_id FROM profiles p2 WHERE p2.id = shift_assignments.user_id
    )
  )
);

-- Create schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
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

-- Add foreign key constraint for shift_assignments to schedules (was missing)
ALTER TABLE public.shift_assignments 
ADD CONSTRAINT fk_shift_assignments_schedule_id 
FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_assignments_schedule_id ON public.shift_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_user_id ON public.shift_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_company_id ON public.schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON public.schedules(start_time);

-- Create RLS policies for schedules using correct column names
CREATE POLICY "Users can view schedules in their company" 
ON public.schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.company_id = schedules.company_id OR profiles.company_id IS NULL)
  )
);

CREATE POLICY "Users can create schedules in their company" 
ON public.schedules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.company_id = schedules.company_id OR profiles.company_id IS NULL)
  )
);

CREATE POLICY "Users can update schedules in their company" 
ON public.schedules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.company_id = schedules.company_id OR profiles.company_id IS NULL)
  )
);

CREATE POLICY "Users can delete schedules in their company" 
ON public.schedules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.company_id = schedules.company_id OR profiles.company_id IS NULL)
  )
);

-- Update timestamp trigger for schedules
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for shift_assignments  
CREATE TRIGGER update_shift_assignments_updated_at
  BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();