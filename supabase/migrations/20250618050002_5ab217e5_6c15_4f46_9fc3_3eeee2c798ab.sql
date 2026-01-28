
-- Create positions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'supervisor', 'manager', 'admin')),
  department_id UUID REFERENCES public.departments(id),
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add position_id to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'position_id' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN position_id UUID REFERENCES public.positions(id);
  END IF;
END $$;

-- Create some default positions
INSERT INTO public.positions (name, role, description) VALUES
  ('Staff Member', 'staff', 'General staff position'),
  ('Team Supervisor', 'supervisor', 'Supervises team operations'),
  ('Department Manager', 'manager', 'Manages department operations'),
  ('System Administrator', 'admin', 'Full system access and administration')
ON CONFLICT DO NOTHING;

-- Enable RLS on positions table
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for positions
DROP POLICY IF EXISTS "Everyone can view positions" ON public.positions;
CREATE POLICY "Everyone can view positions" ON public.positions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage positions" ON public.positions;
CREATE POLICY "Admins can manage positions" ON public.positions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Add updated_at trigger for positions
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
