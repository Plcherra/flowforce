export const MOCK_KPI_INSIGHTS = [
  { metric: 'Attendance Rate', change: -12, signal: 'drop', impact: 'high' },
  { metric: 'Task Completion', change: 8, signal: 'rise', impact: 'moderate' },
] as const satisfies Array<{
  metric: string;
  change: number;
  signal: string;
  impact: string;
}>;

export const MOCK_IDEA_KPI_SUMMARY = [
  { id: 'attendance-rate', label: 'Attendance Rate', value: 88.2, delta: -4.5, trend: 'down', unit: '%' },
  { id: 'task-completion', label: 'Task Completion', value: 74.6, delta: 6.3, trend: 'up', unit: '%' },
  { id: 'shift-coverage', label: 'Shift Coverage', value: 92.1, delta: -1.2, trend: 'down', unit: '%' },
  { id: 'issue-resolution', label: 'Issue Resolution Time', value: 3.4, delta: -0.6, trend: 'up', unit: 'hrs' },
] as const satisfies Array<{
  id: string;
  label: string;
  value: number;
  delta: number;
  trend: 'up' | 'down' | 'flat';
  unit: string;
}>;
