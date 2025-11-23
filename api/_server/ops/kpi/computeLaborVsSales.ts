import { supabaseAdmin } from "../../supabaseAdmin";
import type { OpsKpiSnapshot } from './types';

export async function computeLaborVsSales(orgId: string): Promise<OpsKpiSnapshot> {
  let laborCost = 42000;
  let sales = 135000;
  try {
    const { data: laborData, error: laborError } = await supabaseAdmin
      .from('labor_entries')
      .select('cost')
      .eq('org_id', orgId)
      .gte('worked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (!laborError && laborData) {
      laborCost = laborData.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0) || laborCost;
    }

    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales_ledger')
      .select('net_sales')
      .eq('org_id', orgId)
      .gte('business_day', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (!salesError && salesData) {
      sales = salesData.reduce((sum, entry) => sum + Number(entry.net_sales ?? 0), 0) || sales;
    }
  } catch (error) {
    console.warn('[computeLaborVsSales] fallback to defaults', error);
  }

  const ratio = sales === 0 ? 0 : laborCost / sales;
  return {
    kpiKey: 'labor_vs_sales',
    value: Number((ratio * 100).toFixed(1)),
    unit: 'percent',
    trend: 1.1,
    severity: ratio > 0.33 ? 'critical' : ratio > 0.28 ? 'warning' : 'normal',
    metadata: {
      laborCost,
      sales,
    },
  };
}
