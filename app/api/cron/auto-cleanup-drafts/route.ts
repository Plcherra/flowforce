import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../_server/supabaseAdmin';
import { createServerLogger } from '../../_server/utils/logger';
import { verifyCronRequest } from '@/lib/cron/verifyCron';

const loggerScope = 'cron-auto-cleanup-drafts';

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
  const logger = createServerLogger(loggerScope, { requestId, tags: ['cron', 'cleanup'] });
  const auth = verifyCronRequest(toPlainHeaders(request.headers));

  if (!auth.ok) {
    logger.warn('Cron authentication failed', { context: { reason: auth.reason } });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  logger.info('Draft cleanup started', { context: { cutoff: cutoffIso } });

  try {
    const deletedCount = await deleteDrafts(cutoffIso, logger);

    logger.info('Draft cleanup finished', { context: { deletedCount, cutoff: cutoffIso } });

    return NextResponse.json({ ok: true, deleted: deletedCount, cutoff: cutoffIso });
  } catch (error) {
    logger.error('Draft cleanup failed', { error });
    return NextResponse.json({ error: 'draft_cleanup_failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

async function deleteDrafts(
  cutoffIso: string,
  logger: ReturnType<typeof createServerLogger>,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .delete()
    .eq('is_draft', true)
    .lte('created_at', cutoffIso)
    .select('id');

  if (!error) {
    return data?.length ?? 0;
  }

  logger.warn('Primary draft cleanup failed, attempting fallback', { error, context: { cutoff: cutoffIso } });

  const fallback = await supabaseAdmin
    .from('tasks')
    .delete()
    .eq('status', 'draft')
    .lte('created_at', cutoffIso)
    .select('id');

  if (fallback.error) {
    logger.error('Fallback draft cleanup failed', { error: fallback.error, context: { cutoff: cutoffIso } });
    throw fallback.error;
  }

  return fallback.data?.length ?? 0;
}
