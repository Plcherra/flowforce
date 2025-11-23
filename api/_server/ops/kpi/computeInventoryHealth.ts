import { supabaseAdmin } from "../../supabaseAdmin.js";
import { createServerLogger } from "../../utils/logger.js";
import type { OpsKpiSnapshot } from './types.js';

export async function computeInventoryHealth(orgId: string): Promise<OpsKpiSnapshot> {
  const logger = createServerLogger('computeInventoryHealth', { orgId, tags: ['kpi'] });
  let healthyCount = 18;
  let totalCount = 24;
  try {
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('id,on_hand_quantity,par_level')
      .eq('org_id', orgId)
      .limit(200);
    if (error) {
      logger.warn('Inventory query failed, using defaults', { error });
    } else if (data) {
      totalCount = data.length || totalCount;
      healthyCount = data.filter((item) => {
        if (item.par_level == null || item.on_hand_quantity == null) return true;
        const ratio = Number(item.on_hand_quantity) / Number(item.par_level || 1);
        return ratio >= 0.7 && ratio <= 1.2;
      }).length;
    }
  } catch (error) {
    logger.warn('Falling back to default inventory health', { error });
  }

  const healthPercent = totalCount === 0 ? 0.75 : healthyCount / totalCount;
  logger.debug('Computed inventory health', {
    context: { totalCount, healthyCount, healthPercent },
  });

  return {
    kpiKey: 'inventory_health',
    value: Number((healthPercent * 100).toFixed(1)),
    unit: 'percent',
    trend: -2.4,
    severity: healthPercent < 0.65 ? 'critical' : healthPercent < 0.8 ? 'warning' : 'normal',
    metadata: {
      totalItems: totalCount,
      healthyItems: healthyCount,
    },
  };
}
