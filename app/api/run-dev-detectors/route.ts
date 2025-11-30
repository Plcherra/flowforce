import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { runDevAutoPlan } from '../_server/ops/dev-detectors/devAutoPlanBuilder';
import { createServerLogger } from '../_server/utils/logger';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createServerLogger('run-dev-detectors', { requestId, tags: ['cron', 'dev'] });

  try {
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
