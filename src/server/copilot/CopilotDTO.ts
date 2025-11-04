import type { Json } from '../../integrations/supabase/public-types';

export type CopilotActionSource =
  | 'scenario'
  | 'scheduler'
  | 'guardrail'
  | 'chat'
  | 'performance'
  | 'recognition'
  | 'system';

export type CopilotActionStatus = 'queued' | 'executing' | 'completed' | 'failed' | 'skipped';

export interface Timeframe {
  start: string;
  end: string;
  timezone?: string;
  label?: string;
}

export interface ForecastConfidenceBand {
  metric: string;
  point: number;
  lower: number;
  upper: number;
  confidence: number; // 0-1
  horizon: string;
  isAnomaly?: boolean;
  baseline?: number;
}

export interface CopilotMetricSnapshot {
  metric: string;
  value: number;
  trend?: 'up' | 'down' | 'flat';
  change?: number;
  unit?: string;
  observedAt: string;
  metadata?: Record<string, unknown>;
}

export interface CopilotSignal {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric?: string;
  observedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CopilotActorContext {
  userId: string;
  companyId: string;
  roles: string[];
  permissions?: string[];
  email?: string;
  displayName?: string;
}

export interface CopilotContext {
  companyId: string;
  source: CopilotActionSource;
  timeframe: Timeframe;
  actor: CopilotActorContext;
  forecast?: ForecastConfidenceBand[];
  metrics?: CopilotMetricSnapshot[];
  signals?: CopilotSignal[];
  policyOverrides?: {
    allow?: string[];
    deny?: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface CopilotActionTarget {
  type: 'employee' | 'team' | 'schedule' | 'task' | 'webhook' | 'idea' | 'recognition' | 'custom';
  id?: string;
  path?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface CopilotImpactEstimate {
  metric: string;
  delta: number;
  unit?: string;
  confidence: number;
  horizon?: string;
}

export interface CopilotActionPayload {
  companyId: string;
  actorUserId: string;
  source: CopilotActionSource;
  dedupeKey: string;
  actionType: string;
  status?: CopilotActionStatus;
  target?: CopilotActionTarget;
  payload: Json | Record<string, unknown>;
  evaluation: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  impacts?: CopilotImpactEstimate[];
  guardrails?: string[];
  notes?: string[];
  confidence: number; // 0-1
  queuedAt?: string;
}

export interface CopilotDiagnostic {
  level: 'info' | 'warning' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export interface CopilotEvaluationResult {
  context: CopilotContext;
  summary: string;
  insights: CopilotSignal[];
  recommendedActions: CopilotActionPayload[];
  skippedActions?: CopilotActionPayload[];
  diagnostics?: CopilotDiagnostic[];
  generatedAt: string;
}

export interface CopilotQueueResponse {
  queued: number;
  skipped: number;
  actionIds?: string[];
  evaluation?: CopilotEvaluationResult;
  requestId?: string;
  mode?: 'enqueue' | 'preview';
  denied?: Array<{
    action: CopilotActionPayload;
    reason: string;
    missingRoles?: string[];
  }>;
}
