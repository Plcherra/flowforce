import { supabaseAdmin } from "../../supabaseAdmin";
import { createServerLogger } from "../../utils/logger";
import type { OpsKpiSnapshot } from '../kpi/types';
import { computeTasksCompliance } from '../kpi/computeTasksCompliance';
import { computeInventoryHealth } from '../kpi/computeInventoryHealth';
import { computeLaborVsSales } from '../kpi/computeLaborVsSales';

export interface RunKpiDetectorsOptions {
  orgId: string;
}

const DETECTORS = [computeTasksCompliance, computeInventoryHealth, computeLaborVsSales];

export async function runKpiDetectors({ orgId }: RunKpiDetectorsOptions): Promise<OpsKpiSnapshot[]> {
  const logger = createServerLogger('runKpiDetectors', { orgId, tags: ['kpi', 'detector'] });
  logger.info('Running KPI detectors');

  const snapshots = await Promise.all(DETECTORS.map((detector) => detector(orgId)));
  const filtered = snapshots.filter(Boolean) as OpsKpiSnapshot[];

  if (filtered.length === 0) {
    logger.warn('No KPI snapshots generated');
    return [];
  }

  const rows = filtered.map((snapshot) => ({
    org_id: orgId,
    kpi_key: snapshot.kpiKey,
    value: snapshot.value,
    unit: snapshot.unit,
    trend: snapshot.trend,
    severity: snapshot.severity ?? 'normal',
    metadata: snapshot.metadata ?? {},
  }));

  const { error } = await supabaseAdmin.from('ops_kpi_snapshots').insert(rows);
  if (error) {
    logger.error('Failed to upsert KPI snapshots', { error, context: { count: rows.length } });
    throw error;
  }

  logger.info('KPI snapshots persisted', { context: { count: rows.length } });

  return filtered;
}
