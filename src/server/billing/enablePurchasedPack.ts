import type { SupabaseClient } from "@supabase/supabase-js"; // pragma: allowlist secret
import { withPackEnabled } from "@/config/packCatalog";
import type { OptionalPackId, PackFlags } from "@/config/packFlags";
import { readPackFlagsFromAdminConfig } from "@/config/packFlags";
import {
  AUDIT_ACTIONS,
  getAuditEventMetadata,
} from "@/services/audit/auditEvents";

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
  const { data, error } = await client
    .from("system_settings")
    .select("admin_config")
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  const current = readPackFlagsFromAdminConfig(data?.admin_config);
  if (current[input.pack]) {
    return { ok: true, flags: current };
  }

  const nextAdminConfig = withPackEnabled(data?.admin_config, input.pack);
  const flags = readPackFlagsFromAdminConfig(nextAdminConfig);
  const now = new Date().toISOString();

  if (!data) {
    const { error: insertError } = await client.from("system_settings").insert({
      company_id: input.companyId,
      admin_config: nextAdminConfig,
    });
    if (insertError) return { ok: false, message: insertError.message };
  } else {
    const { error: updateError } = await client
      .from("system_settings")
      .update({
        admin_config: nextAdminConfig,
        updated_at: now,
      })
      .eq("company_id", input.companyId);
    if (updateError) return { ok: false, message: updateError.message };
  }

  const auditMetadata = getAuditEventMetadata(AUDIT_ACTIONS.settingsUpdated);
  const { error: auditError } = await client.from("audit_log").insert({
    action: AUDIT_ACTIONS.settingsUpdated,
    actorid: input.actorId ?? null,
    company_id: input.companyId,
    table_name: "system_settings",
    recordid: input.companyId,
    metadata: {
      ...auditMetadata,
      source: input.source,
      pack: input.pack,
      checkoutSessionId: input.checkoutSessionId ?? null,
    },
  });

  if (auditError) {
    return {
      ok: false,
      message: `Pack flag saved but audit log failed: ${auditError.message}`,
    };
  }

  return { ok: true, flags };
}
