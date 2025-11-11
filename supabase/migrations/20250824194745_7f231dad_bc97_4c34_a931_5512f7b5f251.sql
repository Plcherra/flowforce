-- Create compliance_rules table
CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL, -- 'daily_hours', 'weekly_hours', 'break_time', 'overtime_limit'
  value INTEGER NOT NULL, -- The limit value (hours/minutes)
  role TEXT, -- Optional: specific role this applies to
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Company members can view compliance rules"
ON public.compliance_rules FOR SELECT
USING (company_id = get_user_company_id());

CREATE POLICY "Company admins can manage compliance rules"
ON public.compliance_rules FOR ALL
USING (company_id = get_user_company_id() AND is_company_admin());

-- Add missing properties to schedules table to match component expectations
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS required_headcount INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create updated_at trigger for compliance_rules
CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON public.compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert some default compliance rules
INSERT INTO public.compliance_rules (company_id, rule_type, value, description, created_by)
SELECT 
  c.id,
  'daily_hours',
  8,
  'Maximum hours per day',
  c.owner_id
FROM public.companies c
ON CONFLICT DO NOTHING;

INSERT INTO public.compliance_rules (company_id, rule_type, value, description, created_by)
SELECT 
  c.id,
  'weekly_hours',
  40,
  'Maximum hours per week',
  c.owner_id
FROM public.companies c
ON CONFLICT DO NOTHING;