type CountResult = {
  count: number;
  error?: string;
};

export type OnboardingSetupVerification = {
  ok: boolean;
  companyId: string;
  userId: string;
  missing: string[];
  counts: {
    companyMembers: CountResult;
    systemSettings: CountResult;
    companyRoles: CountResult;
    setupAuditEvents: CountResult;
  };
};

type SupabaseLikeClient = {
  from: (table: string) => any;
};

const countRows = async (
  client: SupabaseLikeClient,
  table: string,
  filters: Record<string, string>,
): Promise<CountResult> => {
  let query = client.from(table).select("id", { count: "exact", head: true });

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;

  if (error) {
    return { count: 0, error: error.message ?? String(error) };
  }

  return { count: count ?? 0 };
};

export const verifyOnboardingSetup = async (
  client: SupabaseLikeClient,
  params: { companyId: string; userId: string },
): Promise<OnboardingSetupVerification> => {
  const { companyId, userId } = params;
  const missing: string[] = [];

  const { data: company, error: companyError } = await client
    .from("companies")
    .select("id, ownerid, registration_complete")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    missing.push("companies");
  } else {
    if (company.ownerid !== userId) missing.push("companies.ownerid");
    if (company.registration_complete !== true) {
      missing.push("companies.registration_complete");
    }
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, company_id, role, is_company_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    missing.push("profiles");
  } else {
    if (profile.company_id !== companyId) missing.push("profiles.company_id");
    if (profile.role !== "owner") missing.push("profiles.role");
    if (profile.is_company_admin !== true) {
      missing.push("profiles.is_company_admin");
    }
  }

  const companyMembers = await countRows(client, "company_members", {
    company_id: companyId,
    user_id: userId,
  });
  const systemSettings = await countRows(client, "system_settings", {
    company_id: companyId,
  });
  const companyRoles = await countRows(client, "company_roles", {
    company_id: companyId,
  });
  const setupAuditEvents = await countRows(client, "audit_log", {
    company_id: companyId,
    action: "company.setup_verified",
  });

  if (companyMembers.error || companyMembers.count !== 1) {
    missing.push("company_members");
  }
  if (systemSettings.error || systemSettings.count !== 1) {
    missing.push("system_settings");
  }
  if (companyRoles.error || companyRoles.count < 4) {
    missing.push("company_roles");
  }
  if (setupAuditEvents.error || setupAuditEvents.count < 1) {
    missing.push("audit_log.company.setup_verified");
  }

  return {
    ok: missing.length === 0,
    companyId,
    userId,
    missing,
    counts: {
      companyMembers,
      systemSettings,
      companyRoles,
      setupAuditEvents,
    },
  };
};
