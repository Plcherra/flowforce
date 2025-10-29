export type AssistantMetricTrend = 'up' | 'down' | 'steady';

export interface AssistantMetric {
  label: string;
  value: string;
  trend?: AssistantMetricTrend;
  helperText?: string;
}

export interface AssistantInsight {
  title: string;
  detail: string;
}

export interface AssistantAction {
  label: string;
  action: string;
  intent?: 'analysis' | 'optimization' | 'copilot';
}

export type AssistantContextType = 'form' | 'report' | 'combined';

export interface AssistantContext {
  type: AssistantContextType;
  title: string;
  subtitle?: string;
  metrics: AssistantMetric[];
  insights: AssistantInsight[];
  recommendedActions: AssistantAction[];
}
