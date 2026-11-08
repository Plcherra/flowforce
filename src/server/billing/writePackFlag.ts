import type { SupabaseClient } from "@supabase/supabase-js"; // pragma: allowlist secret
import { withPackDisabled, withPackEnabled } from "@/config/packCatalog";
import type { OptionalPackId, PackFlags } from "@/config/packFlags";
import { readPackFlagsFromAdminConfig } from "@/config/packFlags";
import {
  AUDIT_ACTIONS,
  getAuditEventMetadata,
} from "@/services/audit/auditEvents";

export type WritePackFlagInput = {
  companyId: string;
  pack: OptionalPackId;
  enabled: boolean;
  actorId?: string | null;
  checkoutSessionId?: string | null;
  source: string;
};

type SettingsRow = {
  admin_config: unknown;
  updated_at: string;
};

const ATTEMPTS = 3;

/**
 * Set one pack flag in system_settings.admin_config.packFlags.
 * Retries when updated_at changed so a concurrent pack write is not lost.
 * Does not change tenantManagement (the workspace plan).
 */
export async function writePackFlag(
  client: SupabaseClient, // pragma: allowlist secret
  input: WritePackFlagInput,
): Promise<{ ok: true; flags: PackFlags } | { ok: false; message: string }> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const { data, error } = await client
      .from("system_settings")
      .select("admin_config, updated_at")
      .eq("company_id", input.companyId)
      .maybeSingle();

    if (error) return { ok: false, message: error.message };

    const row = data as SettingsRow | null;
    const current = readPackFlagsFromAdminConfig(row?.admin_config);
    if (current[input.pack] === input.enabled) {
      return { ok: true, flags: current };
    }

    const nextAdminConfig = input.enabled
      ? withPackEnabled(row?.admin_config, input.pack)
      : withPackDisabled(row?.admin_config, input.pack);
    const flags = readPackFlagsFromAdminConfig(nextAdminConfig);
    const now = new Date().toISOString();

    if (!row) {
      const { error: insertError } = await client.from("system_settings").insert({
        company_id: input.companyId,
        admin_config: nextAdminConfig,
      });
      if (insertError) {
        if (attempt < ATTEMPTS - 1) continue;
        return { ok: false, message: insertError.message };
      }
    } else {
      const { data: written, error: updateError } = await client
        .from("system_settings")
        .update({
          admin_config: nextAdminConfig,
          updated_at: now,
        })
        .eq("company_id", input.companyId)
        .eq("updated_at", row.updated_at)
        .select("admin_config");

      if (updateError) return { ok: false, message: updateError.message };
      if (!written || written.length === 0) continue;
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
        packEnabled: input.enabled,
        checkoutSessionId: input.checkoutSessionId ?? null,
        details: [
          {
            field: "pack",
            pack: input.pack,
            after: input.enabled,
          },
        ],
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

  return { ok: false, message: "Pack flag changed while saving. Try again." };
}
