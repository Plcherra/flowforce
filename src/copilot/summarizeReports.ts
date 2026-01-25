import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SummarizeWeeklyReportsPayload {
  weekStart: string;
  weekEnd: string;
  companyId?: string;
}

type SummarizeWeeklyReportsResponse = {
  summariesUpdated?: number;
  [key: string]: unknown;
} | null;

function buildPayload(now: Dayjs, companyId?: string): SummarizeWeeklyReportsPayload {
  const weekStart = now.startOf('week').add(1, 'day').format('YYYY-MM-DD');
  const weekEnd = now.startOf('week').add(7, 'day').format('YYYY-MM-DD');

  return companyId
    ? { weekStart, weekEnd, companyId }
    : { weekStart, weekEnd };
}

export async function summarizeWeeklyReports(now: Dayjs = dayjs(), companyId?: string): Promise<SummarizeWeeklyReportsResponse> {
  const payload = buildPayload(now, companyId);

  try {
    const { data, error } = await supabase.functions.invoke<SummarizeWeeklyReportsResponse>('summarize-weekly-reports', {
      body: payload,
    });

    if (error) {
      throw new Error(error.message ?? 'Failed to summarize weekly reports via RPC.');
    }

    return data ?? null;
  } catch (rpcError) {
    logger.error('[summarizeWeeklyReports] Supabase function invocation failed', { error: rpcError, tags: ['error'] });
    throw rpcError;
  }
}

export default summarizeWeeklyReports;
