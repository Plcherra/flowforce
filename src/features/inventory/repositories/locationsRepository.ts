import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { InventoryLocation } from "@/features/inventory/hooks/types";
import { logger } from "@/utils/logger";

const inventoryLocationSchema: z.ZodType<InventoryLocation> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location_type: z.string(),
  temperature_controlled: z.boolean().nullable().optional(),
  is_active: z.boolean(),
  company_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
}) as unknown as z.ZodType<InventoryLocation>;

type ListInventoryLocationsOptions = {
  companyId?: string;
  supabaseClient?: SupabaseClient;
  resolveCompanyId: () => Promise<string | null>;
};

export async function listInventoryLocations({
  companyId,
  supabaseClient,
  resolveCompanyId,
}: ListInventoryLocationsOptions): Promise<InventoryLocation[]> {
  const client = supabaseClient ?? supabase;
  const scopedCompanyId = companyId ?? (await resolveCompanyId());

  if (!scopedCompanyId) {
    logger.warn(
      "[inventory] listLocations called without an active company context",
      { tags: ["warning"] },
    );
    return [];
  }

  const { data, error } = await client
    .from("inv_locations")
    .select("*")
    .eq("company_id", scopedCompanyId)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => inventoryLocationSchema.parse(row));
}

export type CreateInventoryLocationInput = {
  name: string;
  location_type: string;
  temperature_controlled?: boolean;
  companyId: string;
};

export async function createInventoryLocation({
  name,
  location_type,
  temperature_controlled,
  companyId,
}: CreateInventoryLocationInput): Promise<InventoryLocation> {
  const { data, error } = await supabase
    .from("inv_locations")
    .insert({
      name,
      location_type,
      temperature_controlled:
        typeof temperature_controlled === "boolean"
          ? temperature_controlled
          : null,
      company_id: companyId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return inventoryLocationSchema.parse(data);
}

export async function deleteInventoryLocation(id: string): Promise<void> {
  const { error } = await supabase.from("inv_locations").delete().eq("id", id);
  if (error) throw error;
}
