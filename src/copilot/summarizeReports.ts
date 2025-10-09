import dayjs from 'dayjs';
import { supabase } from '@/integrations/supabase/client';

export async function summarizeWeeklyReports(now = dayjs()) {
  const weekStart = now.startOf('week').add(1, 'day').format('YYYY-MM-DD');
  const weekEnd = now.startOf('week').add(7, 'day').format('YYYY-MM-DD');

  const { data: reports, error } = await supabase
    .from('employee_report')
    .select('employee_id, date, severity, category, notes')
    .gte('date', weekStart)
    .lt('date', weekEnd);
  if (error) throw error;

  const byEmployee = new Map<string, typeof reports>();
  (reports ?? []).forEach((report) => {
    const list = byEmployee.get(report.employee_id) ?? [];
    list.push(report);
    byEmployee.set(report.employee_id, list);
  });

  for (const [employeeId, employeeReports] of byEmployee) {
    const summary = simpleSummary(employeeReports);
    await supabase.from('employee_report_summary').upsert({
      employee_id: employeeId,
      week_start: weekStart,
      summary_text: summary,
    }, { onConflict: 'employee_id,week_start' });
  }
}

interface WeeklyReportSummaryInput {
  severity: number;
  category: string;
}

function simpleSummary(reports: WeeklyReportSummaryInput[]): string {
  const positives = reports.filter((report) => report.severity >= 4).length;
  const concerns = reports.filter((report) => report.severity <= 2).length;
  const attendanceIssues = reports.filter((report) => report.category === 'attendance').length;

  const parts: string[] = [];
  if (positives > 0) parts.push(`${positives} strong positives.`);
  if (concerns > 0) parts.push(`${concerns} improvement concerns.`);
  if (attendanceIssues > 0) parts.push(`${attendanceIssues} attendance alerts.`);

  return parts.join(' ') || 'No notable activity this week.';
}

export default summarizeWeeklyReports;
