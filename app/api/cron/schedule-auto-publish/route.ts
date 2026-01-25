import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../_server/supabaseAdmin';
import { createServerLogger } from '../../_server/utils/logger';
import { verifyCronRequest } from '@/lib/cron/verifyCron';

const loggerScope = 'cron-schedule-auto-publish';

export const dynamic = 'force-dynamic';

const toPlainHeaders = (headers: Headers) => {
  const plain: Record<string, string> = {};
  headers.forEach((value, key) => {
    plain[key] = value;
  });
  return plain;
};

async function handle(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createServerLogger(loggerScope, { requestId, tags: ['cron', 'publish'] });
  const auth = verifyCronRequest(toPlainHeaders(request.headers));

  if (!auth.ok) {
    logger.warn('Cron authentication failed', { context: { reason: auth.reason } });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  logger.info('Schedule auto-publish started', { context: { asOf: nowIso } });

  try {
    const publishedCount = await publishEligibleSchedules(nowIso, logger);

    logger.info('Schedule auto-publish finished', { context: { publishedCount } });
    return NextResponse.json({ ok: true, published: publishedCount, runAt: nowIso });
  } catch (error) {
    logger.error('Schedule auto-publish failed', { error });
    return NextResponse.json({ error: 'schedule_auto_publish_failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

async function publishEligibleSchedules(
  nowIso: string,
  logger: ReturnType<typeof createServerLogger>,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('work_schedules')
    .update({ status: 'published', published_at: nowIso })
    .eq('status', 'pending')
    .lte('publish_at', nowIso)
    .select('id');

  if (!error) {
    return data?.length ?? 0;
  }

  logger.warn('Schedule publish failed with published_at column, retrying status-only', {
    error,
    context: { runAt: nowIso },
  });

  const fallback = await supabaseAdmin
    .from('work_schedules')
    .update({ status: 'published' })
    .eq('status', 'pending')
    .lte('publish_at', nowIso)
    .select('id');

  if (fallback.error) {
    logger.error('Schedule publish fallback failed', { error: fallback.error, context: { runAt: nowIso } });
    throw fallback.error;
  }

  return fallback.data?.length ?? 0;
}
