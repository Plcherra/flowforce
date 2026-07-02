import {
  isTrialExpired,
  mapLegacyBillingStatus,
  type BillingStatus,
} from "@/services/billing/billingPlans";
import { AUDIT_ACTIONS, getAuditEventMetadata } from "@/services/audit/auditEvents";
import type { SupabaseClient } from "@supabase/supabase-js";

type TenantManagementJson = {
  billingStatus?: string | null;
  accountStatus?: string | null;
  trialEndsAt?: string | null;
  [key: string]: unknown;
};

type AdminConfigJson = {
  tenantManagement?: TenantManagementJson | null;
  [key: string]: unknown;
};

export type ExpireTrialsResult = {
  scanned: number;
  expired: number;
  updatedCompanyIds: string[];
  errors: Array<{ companyId: string; message: string }>;
};

const readStoredBillingStatus = (
  tenant: TenantManagementJson | null | undefined,
): BillingStatus => {
  return mapLegacyBillingStatus(
    tenant?.billingStatus ?? tenant?.accountStatus ?? null,
  );
};

export async function expireExpiredTrials(
  client: SupabaseClient,
  now = new Date(),
): Promise<ExpireTrialsResult> {
  const result: ExpireTrialsResult = {
    scanned: 0,
    expired: 0,
    updatedCompanyIds: [],
    errors: [],
  };

  const { data: rows, error } = await client
    .from("system_settings")
    .select("company_id, admin_config");

  if (error) {
    throw error;
  }

  for (const row of rows ?? []) {
    result.scanned += 1;
    const companyId = String(row.company_id ?? "");
    if (!companyId) continue;

    const adminConfig = (row.admin_config ?? {}) as AdminConfigJson;
    const tenant = adminConfig.tenantManagement ?? {};
    const storedStatus = readStoredBillingStatus(tenant);

    if (storedStatus !== "trial") continue;
    if (!isTrialExpired({ trialEndsAt: tenant.trialEndsAt ?? null }, now)) {
      continue;
    }

    const nextAdminConfig: AdminConfigJson = {
      ...adminConfig,
      tenantManagement: {
        ...tenant,
        billingStatus: "deactivated",
      },
    };

    const { error: updateError } = await client
      .from("system_settings")
      .update({
        admin_config: nextAdminConfig,
        updated_at: now.toISOString(),
      })
      .eq("company_id", companyId);

    if (updateError) {
      result.errors.push({
        companyId,
        message: updateError.message ?? String(updateError),
      });
      continue;
    }

    const auditMetadata = getAuditEventMetadata(AUDIT_ACTIONS.billingTrialExpired);
    const { error: auditError } = await client.from("audit_log").insert({
      company_id: companyId,
      action: AUDIT_ACTIONS.billingTrialExpired,
      table_name: "system_settings",
      recordid: companyId,
      metadata: {
        ...auditMetadata,
        source: "cron.billing-trial-expiry",
        previousBillingStatus: storedStatus,
        nextBillingStatus: "deactivated",
        trialEndsAt: tenant.trialEndsAt ?? null,
      },
    });

    if (auditError) {
      result.errors.push({
        companyId,
        message: `Updated billing status but audit log failed: ${auditError.message}`,
      });
    }

    result.expired += 1;
    result.updatedCompanyIds.push(companyId);
  }

  return result;
}
