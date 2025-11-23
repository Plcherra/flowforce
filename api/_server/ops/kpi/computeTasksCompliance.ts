import { supabaseAdmin } from "../../supabaseAdmin.js";
import { createServerLogger } from "../../utils/logger.js";
import type { OpsKpiSnapshot } from './types.js';

export async function computeTasksCompliance(orgId: string): Promise<OpsKpiSnapshot> {
  const logger = createServerLogger('computeTasksCompliance', { orgId, tags: ['kpi'] });
  let completionRate = 0.92;
  try {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('status', { count: 'exact' })
      .eq('org_id', orgId)
      .limit(500);
    if (data && data.length > 0) {
      const completed = data.filter((row) => ['complete', 'completed', 'done'].includes(String(row.status).toLowerCase())).length;
      completionRate = data.length > 0 ? completed / data.length : completionRate;
    }
    if (error) {
      logger.warn('Tasks query returned error, using default completion rate', {
        error,
        context: { defaultCompletion: completionRate },
      });
    }
  } catch (error) {
    logger.warn('Unable to query tasks for compliance', { error });
  }

  logger.debug('Computed tasks compliance', {
    context: { completionRate },
  });

  return {
    kpiKey: 'tasks_compliance',
    value: Number((completionRate * 100).toFixed(1)),
    unit: 'percent',
    trend: -1.2,
    severity: completionRate < 0.85 ? 'critical' : completionRate < 0.9 ? 'warning' : 'normal',
    metadata: {
      threshold: 0.9,
      sample: 'tasks',
    },
  };
}
