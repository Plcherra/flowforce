import type { ProductLevel } from "@/features/roles/constants/productLevels";
import { locationsAssignableByActor } from "@/features/employees/utils/inviteLocation";
import { supabaseAdmin } from "./supabaseAdmin"; // pragma: allowlist secret

export async function loadInviteLocationGate(params: {
  companyId: string;
  actorLevel: ProductLevel;
  actorLocationId: string | null;
}): Promise<{ allowedIds: string[]; companyHasActiveLocations: boolean }> {
  const { data, error } = await supabaseAdmin // pragma: allowlist secret
    .from("stores")
    .select("id, name, archived_at")
    .eq("company_id", params.companyId);

  if (error) throw error;

  const locations = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? row.id,
    active: !row.archived_at,
  }));
  const allowed = locationsAssignableByActor({
    locations,
    actorLevel: params.actorLevel,
    actorLocationId: params.actorLocationId,
    canInvite: true,
  });

  return {
    allowedIds: allowed.map((location) => location.id),
    companyHasActiveLocations: locations.some((location) => location.active),
  };
}
