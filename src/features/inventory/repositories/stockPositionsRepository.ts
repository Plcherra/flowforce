import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { StockPositionRow } from "@/features/inventory/utils/stockPosition";
import { logger } from "@/utils/logger";

type ListStockPositionsOptions = {
  companyId?: string;
  supabaseClient?: SupabaseClient;
  resolveCompanyId: () => Promise<string | null>;
};

export async function listStockPositions({
  companyId,
  supabaseClient,
  resolveCompanyId,
}: ListStockPositionsOptions): Promise<StockPositionRow[]> {
  const client = supabaseClient ?? supabase;
  const scopedCompanyId = companyId ?? (await resolveCompanyId());

  if (!scopedCompanyId) {
    logger.warn(
      "[inventory] listStockPositions called without an active company context",
      { tags: ["warning"] },
    );
    return [];
  }

  const { data, error } = await client
    .from("inv_stock_positions")
    .select("company_id,item_id,location_id,quantity_on_hand,stock_value")
    .eq("company_id", scopedCompanyId);

  if (error) throw error;
  return (data ?? []) as StockPositionRow[];
}
