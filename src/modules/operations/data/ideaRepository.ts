import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import type { DateRange } from '../hooks/useIdeaInsights';

const trendSchema = z.enum(['up', 'down', 'flat']);

const ideaKpiInsightSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  metric: z.string().optional(),
  value: z.number(),
  delta: z.number().nullable().optional(),
  trend: trendSchema.nullable().optional(),
  unit: z.string().nullable().optional(),
});

const ideaActionSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  cycle_id: z.string().nullable(),
  action_name: z.string(),
  status: z.enum(['pending', 'executed', 'failed']),
  result: z.record(z.any()).nullable(),
  created_at: z.string(),
});

const copilotInsightSchema = z.object({
  id: z.string().optional(),
  message: z.string().optional(),
  summary: z.string().optional(),
  metric: z.string().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  metadata: z.record(z.any()).optional(),
});

const copilotRecommendationSchema = z.object({
  dedupeKey: z.string().optional(),
  id: z.string().optional(),
  actionType: z.string().optional(),
  action: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  evaluation: z.record(z.any()).optional(),
  confidence: z.number().optional(),
  notes: z.array(z.string()).optional(),
  impacts: z
    .array(
      z.object({
        metric: z.string().optional(),
        delta: z.number().optional(),
        unit: z.string().nullable().optional(),
      }),
    )
    .optional(),
  impact: z.string().optional(),
});

const ideaDiagnosticsResponseSchema = z.object({
  evaluation: z
    .object({
      insights: z.array(copilotInsightSchema).optional(),
      recommendedActions: z.array(copilotRecommendationSchema).optional(),
    })
    .optional(),
  causes: z.array(copilotInsightSchema).optional(),
  recommendations: z.array(copilotRecommendationSchema).optional(),
});

export type IdeaKpiInsightRecord = z.infer<typeof ideaKpiInsightSchema>;
export type IdeaActionRecord = z.infer<typeof ideaActionSchema>;
export type CopilotInsight = z.infer<typeof copilotInsightSchema>;
export type CopilotRecommendation = z.infer<typeof copilotRecommendationSchema>;

export function parseIdeaKpiInsights(payload: unknown): IdeaKpiInsightRecord[] {
  return ideaKpiInsightSchema.array().parse(payload ?? []);
}

export async function getIdeaInsights(companyId: string, range: DateRange): Promise<IdeaKpiInsightRecord[]> {
  const { data, error } = await supabase.rpc('get_kpi_summary', {
    company_id: companyId,
    range_start: range.start.toISOString(),
    range_end: range.end.toISOString(),
  });

  if (error) {
    throw error;
  }

  return parseIdeaKpiInsights(data);
}

export async function listIdeaActions(companyId: string, cycleId: string | null): Promise<IdeaActionRecord[]> {
  let query = supabase.from('idea_actions').select('*').eq('company_id', companyId);

  if (cycleId) {
    query = query.eq('cycle_id', cycleId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ideaActionSchema.array().parse(data ?? []);
}

export async function insertIdeaAction(options: {
  companyId: string;
  cycleId: string | null;
  action: string;
  recommendationId?: string;
  autoExecute?: boolean;
  impact?: string;
  metadata?: Record<string, unknown>;
}) {
  const { companyId, cycleId, action, recommendationId, autoExecute = false, impact, metadata } = options;

  const resultPayload = {
    ...(impact ? { impact } : {}),
    ...(metadata ?? {}),
    ...(recommendationId ? { recommendationId } : {}),
  };

  const payload = {
    company_id: companyId,
    cycle_id: cycleId,
    action_name: action,
    status: autoExecute ? 'executed' : 'pending',
    result: Object.keys(resultPayload).length ? resultPayload : null,
  };

  const { data, error } = await supabase.from('idea_actions').insert(payload).select().single();

  if (error) {
    throw error;
  }

  if (autoExecute && data?.id) {
    await supabase.from('idea_actions').update({ status: 'executed' }).eq('id', data.id);
  }

  return ideaActionSchema.parse(data);
}

export async function updateIdeaAction(options: { companyId: string; actionId: string; result?: Record<string, unknown> }) {
  const { companyId, actionId, result } = options;
  const { data, error } = await supabase
    .from('idea_actions')
    .update({
      status: 'executed',
      result: result ?? null,
    })
    .eq('company_id', companyId)
    .eq('id', actionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return ideaActionSchema.parse(data);
}

type DiagnosticsRequest = {
  endpoint: string;
  companyId: string;
  actorUserId: string;
  timeframe: { start: string; end: string; label: string };
  metrics: Array<{
    metric: string | undefined;
    value: number;
    change: number;
    trend: string;
    unit?: string | undefined;
    observedAt: string;
    metadata?: Record<string, unknown>;
  }>;
  signals: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    metric?: string;
    observedAt?: string;
    metadata?: Record<string, unknown>;
  }>;
};

export async function runIdeaDiagnostics(request: DiagnosticsRequest) {
  const response = await fetch(request.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyId: request.companyId,
      actorUserId: request.actorUserId,
      source: 'system',
      mode: 'preview',
      timeframe: request.timeframe,
      metrics: request.metrics,
      signals: request.signals,
    }),
  });

  if (!response.ok) {
    throw new Error(`Diagnostics request failed (${response.status})`);
  }

  const payload = ideaDiagnosticsResponseSchema.parse(await response.json());
  return {
    insights: payload.evaluation?.insights ?? [],
    recommendedActions: payload.evaluation?.recommendedActions ?? [],
    legacyCauses: payload.causes ?? [],
    legacyRecommendations: payload.recommendations ?? [],
  } satisfies {
    insights: CopilotInsight[];
    recommendedActions: CopilotRecommendation[];
    legacyCauses: CopilotInsight[];
    legacyRecommendations: CopilotRecommendation[];
  };
}
