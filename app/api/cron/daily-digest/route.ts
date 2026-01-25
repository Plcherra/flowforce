import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../_server/supabaseAdmin';
import { createServerLogger } from '../../_server/utils/logger';
import { verifyCronRequest } from '@/lib/cron/verifyCron';

const loggerScope = 'cron-daily-digest';

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
  const logger = createServerLogger(loggerScope, { requestId, tags: ['cron', 'digest'] });
  const auth = verifyCronRequest(toPlainHeaders(request.headers));

  if (!auth.ok) {
    logger.warn('Cron authentication failed', { context: { reason: auth.reason } });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startOfYesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const endOfYesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  logger.info('Daily digest run started', {
    context: { windowStart: startOfYesterday.toISOString(), windowEnd: endOfYesterday.toISOString() },
  });

  try {
    const [shiftsWorked, openTasks, scheduleChanges] = await Promise.all([
      countPublishedShifts(startOfYesterday, endOfYesterday, logger),
      countOpenTasks(startOfYesterday, endOfYesterday, logger),
      countScheduleChanges(startOfYesterday, endOfYesterday, logger),
    ]);

    const insertPayload = {
      insight_date: startOfYesterday.toISOString().slice(0, 10),
      total_shifts_worked: shiftsWorked,
      open_tasks: openTasks,
      schedule_changes: scheduleChanges,
      collected_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('daily_insights').insert(insertPayload);

    if (error) {
      logger.error('Failed to persist daily insights', { error, context: insertPayload });
      throw error;
    }

    logger.info('Daily digest run finished', {
      context: { shiftsWorked, openTasks, scheduleChanges },
    });

    return NextResponse.json({
      ok: true,
      insightDate: insertPayload.insight_date,
      shiftsWorked,
      openTasks,
      scheduleChanges,
    });
  } catch (error) {
    logger.error('Daily digest cron failed', { error });
    return NextResponse.json({ error: 'daily_digest_failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

async function countPublishedShifts(
  start: Date,
  end: Date,
  logger: ReturnType<typeof createServerLogger>,
): Promise<number> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { count, error } = await supabaseAdmin
    .from('schedule_shifts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('start_time', startIso)
    .lt('start_time', endIso);

  if (error) {
    logger.warn('Unable to count published shifts', { error, context: { start: startIso, end: endIso } });
    return 0;
  }

  return count ?? 0;
}

async function countOpenTasks(
  start: Date,
  end: Date,
  logger: ReturnType<typeof createServerLogger>,
): Promise<number> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { count, error } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', ['todo', 'in_progress', 'review'])
    .gte('updated_at', startIso)
    .lt('updated_at', endIso);

  if (error) {
    logger.warn('Unable to count open tasks', { error, context: { start: startIso, end: endIso } });
    return 0;
  }

  return count ?? 0;
}

async function countScheduleChanges(
  start: Date,
  end: Date,
  logger: ReturnType<typeof createServerLogger>,
): Promise<number> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { count, error } = await supabaseAdmin
    .from('schedules')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', startIso)
    .lt('updated_at', endIso);

  if (error) {
    logger.warn('Unable to count schedule changes', { error, context: { start: startIso, end: endIso } });
    return 0;
  }

  return count ?? 0;
}
