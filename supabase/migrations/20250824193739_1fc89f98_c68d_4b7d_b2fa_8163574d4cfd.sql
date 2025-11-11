-- Create comprehensive scheduling tables for next-gen system

-- Shift templates with advanced properties
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  min_staff INTEGER DEFAULT 1,
  max_staff INTEGER DEFAULT 5,
  required_skills JSONB DEFAULT '[]'::jsonb,
  hourly_rate DECIMAL(10,2),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff availability tracking
CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_preferred BOOLEAN DEFAULT false,
  week_start_date DATE, -- For specific week overrides
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, day_of_week, week_start_date)
);

-- Enhanced schedules table
DROP TABLE IF EXISTS schedules CASCADE;
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  is_published BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  template_id UUID REFERENCES shift_templates(id),
  notes TEXT,
  requirements JSONB DEFAULT '[]'::jsonb,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Schedule assignments with enhanced tracking
DROP TABLE IF EXISTS schedule_assignments CASCADE;
CREATE TABLE schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'declined', 'swap_requested', 'completed')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(schedule_id, user_id)
);

-- Shift swap requests
CREATE TABLE IF NOT EXISTS shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  requesting_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id), -- Can be null for open claims
  swap_type TEXT NOT NULL CHECK (swap_type IN ('swap', 'claim', 'give_away')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'family', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff performance tracking for AI recommendations
CREATE TABLE IF NOT EXISTS staff_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  role TEXT NOT NULL,
  attendance_status TEXT CHECK (attendance_status IN ('present', 'late', 'absent', 'excused')),
  performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 5),
  hours_worked DECIMAL(4,2),
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  break_compliance BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date, role)
);

-- Compliance rules
CREATE TABLE IF NOT EXISTS compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('max_daily_hours', 'max_weekly_hours', 'min_break_time', 'max_consecutive_days')),
  role TEXT, -- Can be null for company-wide rules
  value DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Scheduling notifications queue
CREATE TABLE IF NOT EXISTS scheduling_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  schedule_id UUID REFERENCES schedules(id),
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  channels JSONB DEFAULT '["app"]'::jsonb, -- app, email, whatsapp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI insights cache
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Enable RLS on all tables
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Shift templates
CREATE POLICY "Company members can view shift templates" ON shift_templates FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company admins can manage shift templates" ON shift_templates FOR ALL USING ((company_id = get_user_company_id()) AND is_company_admin());

-- Staff availability
CREATE POLICY "Users can manage their own availability" ON staff_availability FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all availability" ON staff_availability FOR SELECT USING (is_company_admin());

-- Schedules
CREATE POLICY "Company members can view schedules" ON schedules FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Admins can manage schedules" ON schedules FOR ALL USING ((company_id = get_user_company_id()) AND is_company_admin());

-- Schedule assignments
CREATE POLICY "Users can view their assignments" ON schedule_assignments FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM schedules s WHERE s.id = schedule_assignments.schedule_id AND s.company_id = get_user_company_id())
);
CREATE POLICY "Admins can manage assignments" ON schedule_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM schedules s WHERE s.id = schedule_assignments.schedule_id AND s.company_id = get_user_company_id() AND is_company_admin())
);

-- Shift swaps
CREATE POLICY "Users can manage their shift swaps" ON shift_swaps FOR ALL USING (
  requesting_user_id = auth.uid() OR target_user_id = auth.uid() OR is_company_admin()
);

-- Time off requests
CREATE POLICY "Users can manage their time off" ON time_off_requests FOR ALL USING (user_id = auth.uid() OR is_company_admin());

-- Staff performance
CREATE POLICY "Admins can manage performance data" ON staff_performance FOR ALL USING (is_company_admin());
CREATE POLICY "Users can view their own performance" ON staff_performance FOR SELECT USING (user_id = auth.uid());

-- Compliance rules
CREATE POLICY "Company members can view compliance rules" ON compliance_rules FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Admins can manage compliance rules" ON compliance_rules FOR ALL USING ((company_id = get_user_company_id()) AND is_company_admin());

-- Scheduling notifications
CREATE POLICY "Users can view their notifications" ON scheduling_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage notifications" ON scheduling_notifications FOR ALL USING (is_company_admin());

-- AI insights
CREATE POLICY "Company members can view AI insights" ON ai_insights FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Admins can manage AI insights" ON ai_insights FOR ALL USING ((company_id = get_user_company_id()) AND is_company_admin());

-- Indexes for performance
CREATE INDEX idx_schedules_company_time ON schedules(company_id, start_time);
CREATE INDEX idx_schedule_assignments_user ON schedule_assignments(user_id);
CREATE INDEX idx_staff_availability_user_day ON staff_availability(user_id, day_of_week);
CREATE INDEX idx_shift_swaps_status ON shift_swaps(status);
CREATE INDEX idx_notifications_send_at ON scheduling_notifications(send_at) WHERE NOT is_sent;
CREATE INDEX idx_ai_insights_type_company ON ai_insights(company_id, insight_type, expires_at);

-- Triggers for updated_at
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_availability_updated_at BEFORE UPDATE ON staff_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_schedule_assignments_updated_at BEFORE UPDATE ON schedule_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shift_swaps_updated_at BEFORE UPDATE ON shift_swaps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_time_off_requests_updated_at BEFORE UPDATE ON time_off_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();