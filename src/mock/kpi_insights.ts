import type { AIKpiInsight } from '@/hooks/useAIKPIInsights';

export const MOCK_KPI_INSIGHTS: AIKpiInsight[] = [
  { metric: 'Attendance Rate', change: -12, signal: 'drop', impact: 'high' },
  { metric: 'Task Completion', change: 8, signal: 'rise', impact: 'moderate' },
];
