import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { runKpiDetectors } from '../_server/ops/detectors/runKpiDetectors';
import { detectIssues } from '../_server/ops/issues/detectIssues';
import { supabaseAdmin } from '../_server/supabaseAdmin';
import { generateAutoPlanForOrg } from '../_server/ops/detectors/autoPlanBuilder';
import { createServerLogger } from '../_server/utils/logger';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createServerLogger('run-detectors', { requestId, tags: ['cron', 'ops'] });

  try {
    if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized detector invocation attempted');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select('id');

    if (error) {
      logger.error('Failed to load organizations', { error });
      throw error;
    }

    logger.info('Running detectors cron', { context: { orgCount: orgs.length } });

    let processed = 0;
    let failures = 0;

    for (const org of orgs) {
      const id = (org as any).id;
      const orgLogger = logger.child({ orgId: id });

      orgLogger.info('Starting detectors for org');

      try {
        await runKpiDetectors({ orgId: id });
        await detectIssues({ orgId: id });
        await generateAutoPlanForOrg(id);
        processed += 1;
        orgLogger.info('Detectors completed');
      } catch (error) {
        failures += 1;
        orgLogger.error('Detector run failed', { error });
      }
    }

    logger.info('Detector cron finished', {
      context: { processed, failures, total: orgs.length },
    });

    return NextResponse.json({ ok: true, processed, failures, total: orgs.length });
  } catch (err) {
    logger.error('Detector cron error', { error: err });
    return NextResponse.json({ error: 'Cron error', details: String(err) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
