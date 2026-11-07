import { isPlaceholderStoreName } from "@/features/stores/storeDraft";

type Client = {
  from: (table: string) => any;
};

type StoreRow = { id: string; name: string | null; created_at?: string | null };

export async function remapPlaceholderReferences(client: Client, companyId: string) {
  const { data: storeRows, error } = await client
    .from("stores")
    .select("id, name, created_at")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const stores = ((storeRows ?? []) as StoreRow[]).filter(
    (store) => store.id && !isPlaceholderStoreName(store.name ?? ""),
  );
  const first = stores[0];
  if (!first) return;

  const { data: rooms } = await client
    .from("inv_locations")
    .select("id, name, hidden_at, location_type")
    .eq("company_id", companyId);
  const hiddenIds = ((rooms ?? []) as { id: string; name?: string | null; hidden_at?: string | null; location_type?: string | null }[])
    .filter(
      (room) =>
        Boolean(room.hidden_at) ||
        isPlaceholderStoreName(room.name ?? "") ||
        room.location_type === "store",
    )
    .map((room) => room.id);

  if (hiddenIds.length > 0) {
    await client
      .from("profiles")
      .update({ store_id: first.id })
      .eq("company_id", companyId)
      .in("location_id", hiddenIds)
      .is("store_id", null);
    await client
      .from("company_invites")
      .update({ store_id: first.id })
      .eq("company_id", companyId)
      .in("location_id", hiddenIds)
      .is("store_id", null);
  }

  const { data: shifts } = await client
    .from("schedules")
    .select("id, location")
    .eq("company_id", companyId)
    .is("store_id", null);
  for (const shift of (shifts ?? []) as { id: string; location?: string | null }[]) {
    const named = stores.find(
      (store) => (store.name ?? "").trim().toLowerCase() === (shift.location ?? "").trim().toLowerCase(),
    );
    const placeholder = isPlaceholderStoreName(shift.location ?? "");
    if (!named && !placeholder) continue;
    const target = named ?? first;
    await client
      .from("schedules")
      .update({
        store_id: target.id,
        legacy_location: placeholder ? shift.location ?? null : null,
        location: target.name,
      })
      .eq("id", shift.id);
  }

  if (stores.length !== 1) return;
  const { data: forms } = await client
    .from("forms")
    .select("id, settings")
    .eq("company_id", companyId);
  for (const form of (forms ?? []) as { id: string; settings?: unknown }[]) {
    if (!form.settings || typeof form.settings !== "object" || Array.isArray(form.settings)) continue;
    const settings = { ...(form.settings as Record<string, unknown>) };
    const distribution =
      settings.distribution && typeof settings.distribution === "object"
        ? { ...(settings.distribution as Record<string, unknown>) }
        : null;
    if (!distribution || distribution.record_kind !== "list") continue;
    const current = distribution.store_ids;
    if (Array.isArray(current) && current.length > 0) continue;
    distribution.store_ids = [first.id];
    settings.distribution = distribution;
    await client.from("forms").update({ settings }).eq("id", form.id);
  }
}
