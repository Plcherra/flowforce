
-- Create tables for custom reports and analytics
CREATE TABLE public.custom_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('employee', 'timeoff', 'scheduling', 'tasks', 'forms')),
  filters JSONB DEFAULT '{}',
  columns JSONB DEFAULT '[]',
  chart_config JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for report schedules
CREATE TABLE public.report_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.custom_reports(id) ON DELETE CASCADE NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  recipients TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for analytics data cache
CREATE TABLE public.analytics_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_reports
CREATE POLICY "Users can view their own reports or public reports" 
  ON public.custom_reports 
  FOR SELECT 
  USING (created_by = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own reports" 
  ON public.custom_reports 
  FOR INSERT 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own reports" 
  ON public.custom_reports 
  FOR UPDATE 
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own reports" 
  ON public.custom_reports 
  FOR DELETE 
  USING (created_by = auth.uid());

-- RLS policies for report_schedules
CREATE POLICY "Users can manage schedules for their reports" 
  ON public.report_schedules 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_reports 
      WHERE id = report_schedules.report_id AND created_by = auth.uid()
    )
  );

-- RLS policies for analytics_cache (admin only)
CREATE POLICY "Admins can manage analytics cache" 
  ON public.analytics_cache 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_custom_reports_updated_at
  BEFORE UPDATE ON public.custom_reports
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
