export interface OpsKpiSnapshot {
  kpiKey: string;
  value: number;
  unit?: string;
  trend?: number;
  severity?: 'normal' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}
