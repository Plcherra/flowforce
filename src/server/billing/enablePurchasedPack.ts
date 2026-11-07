import type { SupabaseClient } from "@supabase/supabase-js"; // pragma: allowlist secret
import type { OptionalPackId, PackFlags } from "@/config/packFlags";
import { writePackFlag } from "@/server/billing/writePackFlag";

export type EnablePurchasedPackInput = {
  companyId: string;
  pack: OptionalPackId;
  actorId?: string | null;
  checkoutSessionId?: string | null;
  source: string;
};

export async function enablePurchasedPack(
  client: SupabaseClient, // pragma: allowlist secret
  input: EnablePurchasedPackInput,
): Promise<{ ok: true; flags: PackFlags } | { ok: false; message: string }> {
  return writePackFlag(client, { ...input, enabled: true });
}

export async function disablePurchasedPack(
  client: SupabaseClient, // pragma: allowlist secret
  input: EnablePurchasedPackInput,
): Promise<{ ok: true; flags: PackFlags } | { ok: false; message: string }> {
  return writePackFlag(client, { ...input, enabled: false });
}
