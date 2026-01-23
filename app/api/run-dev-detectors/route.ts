import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { runDevAutoPlan } from '../_server/ops/dev-detectors/devAutoPlanBuilder';
import { createServerLogger } from '../_server/utils/logger';
import { verifyCronRequest } from '@/lib/cron/verifyCron';

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
  const logger = createServerLogger('run-dev-detectors', { requestId, tags: ['cron', 'dev'] });

  try {
    // Security: Add authentication for dev detectors route
    const auth = verifyCronRequest(toPlainHeaders(request.headers));
    if (!auth.ok) {
      logger.warn('Unauthorized dev detector invocation attempted', { context: { reason: auth.reason } });
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get('orgId') ?? '000';
    const scoped = logger.child({ orgId });

    scoped.info('Starting dev auto-plan run');
    await runDevAutoPlan(orgId);
    scoped.info('Dev auto-plan run completed');
    return NextResponse.json({ success: true, orgId });
  } catch (err) {
    logger.error('Dev detector error', { error: err });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
