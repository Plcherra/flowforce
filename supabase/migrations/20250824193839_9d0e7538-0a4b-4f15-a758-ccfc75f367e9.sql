-- Add RLS policies for scheduling tables

-- Shift templates policies
CREATE POLICY "Company members can view shift templates" ON shift_templates FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company admins can manage shift templates" ON shift_templates FOR ALL USING ((company_id = get_user_company_id()) AND is_company_admin());

-- Staff availability policies
CREATE POLICY "Users can manage their own availability" ON staff_availability FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all availability" ON staff_availability FOR SELECT USING (is_company_admin());

-- Schedules policies
CREATE POLICY "Company members can view schedules" ON schedules FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Admins can manage schedules" ON schedules FOR ALL USING ((company_id = get_user_company_id()) AND is_company_admin());

-- Schedule assignments policies
CREATE POLICY "Users can view their assignments" ON schedule_assignments FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM schedules s WHERE s.id = schedule_assignments.schedule_id AND s.company_id = get_user_company_id())
);
CREATE POLICY "Admins can manage assignments" ON schedule_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM schedules s WHERE s.id = schedule_assignments.schedule_id AND s.company_id = get_user_company_id() AND is_company_admin())
);

-- Shift swaps policies  
CREATE POLICY "Users can manage their shift swaps" ON shift_swaps FOR ALL USING (
  requesting_user_id = auth.uid() OR target_user_id = auth.uid() OR is_company_admin()
);

-- Time off requests policies
CREATE POLICY "Users can manage their time off" ON time_off_requests FOR ALL USING (user_id = auth.uid() OR is_company_admin());

-- Staff performance policies
CREATE POLICY "Admins can manage performance data" ON staff_performance FOR ALL USING (is_company_admin());
CREATE POLICY "Users can view their own performance" ON staff_performance FOR SELECT USING (user_id = auth.uid());