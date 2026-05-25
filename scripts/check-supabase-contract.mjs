#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_RELATIONS_BY_MODULE = [
  {
    module: "Core / onboarding",
    relations: ["companies", "profiles", "audit_log", "audit_logs"],
  },
  {
    module: "Dashboard",
    relations: [
      "profiles",
      "departments",
      "schedules",
      "time_off_requests",
      "tasks",
    ],
  },
  {
    module: "Employees / HR",
    relations: [
      "profiles",
      "departments",
      "company_roles",
      "user_roles",
      "company_invites",
      "hr_roster_cache",
      "skill_matrix",
      "employee_badge",
      "employee_report",
      "staff_performance",
    ],
  },
  {
    module: "Tasks / goals",
    relations: [
      "tasks",
      "goal_tasks",
      "task_comments",
      "task_activities",
      "task_notifications",
      "reminders",
      "goals",
      "goal_participants",
    ],
  },
  {
    module: "Messages / announcements",
    relations: [
      "message_channels",
      "channel_members",
      "messages",
      "message_reactions",
      "announcements",
      "announcement_reads",
    ],
  },
  {
    module: "Company updates",
    relations: [
      "company_updates",
      "company_update_engagement",
      "company_update_reactions",
      "company_update_comments",
      "recognitions",
    ],
  },
  {
    module: "Calendar",
    relations: [
      "calendar_events_full",
      "calendar_unified_view",
      "calendar_events",
      "event_participants",
      "event_shift_links",
    ],
  },
  {
    module: "Scheduling",
    relations: [
      "schedules",
      "schedule_assignments",
      "time_off_requests",
      "user_unavailability",
      "shift_templates",
      "week_templates",
      "vendor_event",
      "vendor_visits",
    ],
  },
  {
    module: "Forms / sections",
    relations: [
      "forms",
      "form_fields",
      "form_submissions",
      "custom_sections",
      "section_templates",
      "custom_section_pages",
    ],
  },
  {
    module: "Inventory / finance",
    relations: [
      "inventory_categories",
      "inventory_transactions",
      "expenses",
      "payments",
      "purchase_orders",
      "purchase_order_items",
      "inv_items",
      "inv_item_units",
      "inv_locations",
      "inv_units",
      "inv_suppliers",
      "inv_recipes",
      "inv_adjustments",
      "inv_waste",
      "inv_production_events",
      "inv_transfers",
      "inv_counts",
    ],
  },
  {
    module: "Analytics / operations",
    relations: [
      "kpi_insights",
      "idea_actions",
      "idea_cycles",
      "ops_issues",
      "ops_automation_suggestions",
      "ops_kpi_snapshots",
      "performance_reviews",
      "daily_insights",
      "engagement_scores",
    ],
  },
  {
    module: "Learning / recognition / gamification",
    relations: [
      "learning_completions",
      "employee_certifications",
      "certification_catalog",
      "training_modules",
      "training_assignments",
      "goal_rewards",
      "goal_milestones",
      "recognition_award_rules",
      "gamification_leaderboard",
      "badge_catalog",
    ],
  },
];

const READ_RPC_CHECKS = [
  {
    name: "get_company_roles",
    args: { company_uuid: "00000000-0000-4000-8000-000000000000" },
  },
  {
    name: "get_dashboard_stats",
    args: {
      p_company_id: "00000000-0000-4000-8000-000000000000",
      p_today: "2026-05-10",
    },
  },
  {
    name: "get_kpi_summary",
    args: {
      company_id: "00000000-0000-4000-8000-000000000000",
      range_start: "2026-05-03T00:00:00.000Z",
      range_end: "2026-05-10T00:00:00.000Z",
    },
  },
  {
    name: "get_ai_kpi_insights",
    args: {
      company_id: "00000000-0000-4000-8000-000000000000",
      range_start: "2026-05-03T00:00:00.000Z",
      range_end: "2026-05-10T00:00:00.000Z",
    },
  },
  {
    name: "get_recipient_insights",
    args: {
      recipients_filter: { type: "all", departments: [], roles: [], groups: [] },
    },
  },
];

const MUTATING_RPC_EXISTENCE_CHECKS = [
  {
    name: "assert_company_membership",
    args: { p_company_id: null },
  },
  {
    name: "create_company_invite",
    args: {
      company_uuid: null,
      invite_email: null,
      invite_role: "employee",
      employee_first_name: null,
      employee_last_name: null,
      employee_birth_date: null,
      employee_phone: null,
    },
  },
  {
    name: "create_company_with_setup",
    args: {
      company_data: {},
      custom_roles: [],
      positions_data: [],
      owner_user_id: null,
    },
  },
  {
    name: "log_audit_event",
    args: {
      target_user_id: null,
      event_action: null,
      target_table: null,
      target_record_id: null,
      previous_values: null,
      next_values: null,
    },
  },
  {
    name: "replace_event_participants",
    args: { p_company_id: null, p_event_id: null, p_participants: [] },
  },
  {
    name: "replace_event_shift_links",
    args: { p_company_id: null, p_event_id: null, p_shift_ids: [] },
  },
  {
    name: "trigger_onboarding_checklist",
    args: { invite_id: "00000000-0000-4000-8000-000000000000" },
  },
];

const ANON_DENY_RELATIONS = [
  "profiles",
  "companies",
  "company_members",
  "company_roles",
  "positions",
  "system_settings",
  "company_invites",
  "user_permissions",
  "tasks",
  "messages",
  "message_channels",
  "forms",
  "schedules",
  "company_updates",
  "calendar_events",
  "calendar_events_full",
  "calendar_unified_view",
  "vendor_event",
  "payments",
  "expenses",
  "inventory_transactions",
  "kpi_insights",
  "ops_issues",
  "documents",
  "vendor_visits",
  "gamification_leaderboard",
  "recognition_events",
  "audit_log",
  "audit_logs",
  "system_logs",
];

const CORE_RLS_RELATIONS = [
  "companies",
  "profiles",
  "company_members",
  "company_roles",
  "positions",
  "system_settings",
  "company_invites",
  "user_permissions",
  "audit_log",
  "system_logs",
];

const BUSINESS_RLS_RELATIONS = [
  "tasks",
  "task_comments",
  "goals",
  "goal_tasks",
  "calendar_events",
  "event_participants",
  "event_shift_links",
  "company_updates",
  "company_update_comments",
  "company_update_reactions",
  "payments",
  "expenses",
  "inventory_items",
  "inventory_transactions",
  "message_channels",
  "channel_members",
  "messages",
  "message_reactions",
  "forms",
  "form_fields",
  "form_submissions",
  "schedules",
  "schedule_assignments",
  "schedule_rulebooks",
  "schedule_shifts",
  "schedule_workflow_criteria",
  "schedule_workflow_steps",
  "shift_templates",
  "time_off_requests",
  "user_unavailability",
  "week_templates",
  "kpi_insights",
  "idea_actions",
  "idea_cycles",
  "ops_issues",
  "ops_automation_suggestions",
  "ops_kpi_snapshots",
  "performance_reviews",
  "daily_insights",
  "engagement_scores",
  "documents",
  "vendor_visits",
  "gamification_leaderboard",
  "gamification_xp",
  "badge_catalog",
  "employee_certifications",
  "learning_completions",
  "training_assignments",
  "recognition_award_rules",
  "recognition_events",
  "goal_rewards",
];

const RLS_RELATIONS = [...CORE_RLS_RELATIONS, ...BUSINESS_RLS_RELATIONS];

const REQUIRED_STORAGE_BUCKETS = [
  "company-assets",
  "company-updates-media",
  "form-audio",
  "form-images",
  "form-signatures",
  "form-uploads",
  "form-videos",
  "message-attachments",
  "operations-reports",
  "attachments",
];

const EXPECTED_PUBLIC_STORAGE_BUCKETS = [
  "company-assets",
];

const EXPECTED_PRIVATE_STORAGE_BUCKETS = [
  "attachments",
  "company-updates-media",
  "form-audio",
  "form-images",
  "form-signatures",
  "form-uploads",
  "form-videos",
  "message-attachments",
  "operations-reports",
];

const REQUIRED_STORAGE_POLICIES = [
  "Public can read FlowForce public storage objects",
  "Company members can manage company assets",
  "Company members can manage form storage objects",
  "Company members can manage message attachments",
  "Company members can manage report attachments",
  "Company members can manage company update media",
];

const cwd = process.cwd();

function readEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(cwd, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [rawKey, ...rawValueParts] = trimmed.split("=");
      const key = rawKey.trim();
      let value = rawValueParts.join("=").trim();
      value = value.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, key, anonKey, usingServiceRole };
}

function isMissingRelationError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  );
}

function isMissingRpcError(error, rpcName) {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    error?.code === "PGRST202" ||
    message.includes(`function public.${rpcName}`) ||
    message.includes(`function ${rpcName}`) ||
    message.includes("could not find the function")
  );
}

function summarizeError(error) {
  const code = error?.code ? `${error.code}: ` : "";
  return `${code}${error?.message ?? "Unknown error"}`;
}

async function checkRelation(supabase, relation) {
  const { error } = await supabase
    .from(relation)
    .select("*")
    .limit(0);

  if (!error) {
    return { name: relation, status: "ok" };
  }

  if (isMissingRelationError(error)) {
    return { name: relation, status: "missing", error };
  }

  return { name: relation, status: "error", error };
}

async function checkRpc(supabase, rpc) {
  const { error } = await supabase.rpc(rpc.name, rpc.args);

  if (!error) {
    return { name: rpc.name, status: "ok" };
  }

  if (isMissingRpcError(error, rpc.name)) {
    return { name: rpc.name, status: "missing", error };
  }

  return { name: rpc.name, status: "error", error };
}

async function checkRpcPresence(supabase, rpc) {
  const { error } = await supabase.rpc(rpc.name, rpc.args);

  if (!error || !isMissingRpcError(error, rpc.name)) {
    return { name: rpc.name, status: "ok", validationError: error ?? null };
  }

  return { name: rpc.name, status: "missing", error };
}

async function checkAnonExposure(anonSupabase, relation) {
  const { count, error, status } = await anonSupabase
    .from(relation)
    .select("id", { count: "exact", head: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return { name: relation, status: "missing", error };
    }

    return { name: relation, status: "blocked", error };
  }

  if ((count ?? 0) > 0) {
    return { name: relation, status: "exposed", count, httpStatus: status };
  }

  return { name: relation, status: "empty-or-filtered", count, httpStatus: status };
}

async function checkSecurityContract(supabase, usingServiceRole) {
  if (!usingServiceRole) {
    return {
      status: "skipped",
      reason: "SUPABASE_SERVICE_ROLE_KEY is required",
      missingRls: [],
      disabledRls: [],
      disabledPublicTables: [],
      anonGrants: [],
      missingBuckets: [],
      unexpectedPublicBuckets: [],
      unexpectedPrivateBuckets: [],
      missingStoragePolicies: [],
      error: null,
    };
  }

  const { data, error } = await supabase.rpc("get_security_contract_status", {
    rls_tables: RLS_RELATIONS,
    grant_tables: ANON_DENY_RELATIONS,
    bucket_ids: REQUIRED_STORAGE_BUCKETS,
  });

  if (error) {
    return {
      status: isMissingRpcError(error, "get_security_contract_status")
        ? "missing-helper"
        : "error",
      reason: null,
      missingRls: [],
      disabledRls: [],
      disabledPublicTables: [],
      anonGrants: [],
      missingBuckets: [],
      unexpectedPublicBuckets: [],
      unexpectedPrivateBuckets: [],
      missingStoragePolicies: [],
      error,
    };
  }

  const rlsRows = Array.isArray(data?.rls) ? data.rls : [];
  const grants = Array.isArray(data?.grants) ? data.grants : [];
  const disabledPublicTables = Array.isArray(data?.disabledPublicTables)
    ? data.disabledPublicTables
    : [];
  const buckets = Array.isArray(data?.storageBuckets)
    ? data.storageBuckets
    : [];
  const policies = Array.isArray(data?.storagePolicies)
    ? data.storagePolicies
    : [];

  const rlsByTable = new Map(rlsRows.map((row) => [row.table, row]));
  const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
  const policyNames = new Set(policies.map((policy) => policy.name));

  return {
    status: "ok",
    reason: null,
    missingRls: RLS_RELATIONS.filter((table) => !rlsByTable.has(table)),
    disabledRls: RLS_RELATIONS.filter(
      (table) => rlsByTable.has(table) && !rlsByTable.get(table)?.enabled,
    ),
    disabledPublicTables,
    anonGrants: grants.filter((grant) => grant.grantee === "anon"),
    missingBuckets: REQUIRED_STORAGE_BUCKETS.filter(
      (bucket) => !bucketById.has(bucket),
    ),
    unexpectedPublicBuckets: EXPECTED_PRIVATE_STORAGE_BUCKETS.filter(
      (bucket) => bucketById.has(bucket) && bucketById.get(bucket)?.public,
    ),
    unexpectedPrivateBuckets: EXPECTED_PUBLIC_STORAGE_BUCKETS.filter(
      (bucket) => bucketById.has(bucket) && !bucketById.get(bucket)?.public,
    ),
    missingStoragePolicies: REQUIRED_STORAGE_POLICIES.filter(
      (policy) => !policyNames.has(policy),
    ),
    error: null,
  };
}

function printModuleResults(results) {
  for (const result of results) {
    const missing = result.relations.filter((item) => item.status === "missing");
    const errors = result.relations.filter((item) => item.status === "error");

    if (missing.length === 0 && errors.length === 0) {
      process.stdout.write(`OK ${result.module}: ${result.relations.length} ok\n`);
      continue;
    }

    process.stdout.write(`\n${result.module}\n`);

    for (const item of missing) {
      process.stdout.write(`  - missing relation: ${item.name}\n`);
    }

    for (const item of errors) {
      process.stdout.write(
        `  - relation error: ${item.name} (${summarizeError(item.error)})\n`,
      );
    }
  }
}

function printRpcResults(results, mutatingResults) {
  const missing = results.filter((item) => item.status === "missing");
  const errors = results.filter((item) => item.status === "error");
  const ok = results.filter((item) => item.status === "ok");
  const missingMutating = mutatingResults.filter(
    (item) => item.status === "missing",
  );
  const okMutating = mutatingResults.filter((item) => item.status === "ok");

  process.stdout.write(`\nRead RPC checks: ${ok.length}/${results.length} ok\n`);

  for (const item of missing) {
    process.stdout.write(`  - missing RPC: ${item.name}\n`);
  }

  for (const item of errors) {
    process.stdout.write(
      `  - RPC error: ${item.name} (${summarizeError(item.error)})\n`,
    );
  }

  process.stdout.write(
    `\nMutating RPC existence checks: ${okMutating.length}/${mutatingResults.length} present\n`,
  );
  for (const item of missingMutating) {
    process.stdout.write(`  - missing mutating RPC: ${item.name}\n`);
  }
}

function printAnonExposureResults(results) {
  const exposed = results.filter((item) => item.status === "exposed");
  const missing = results.filter((item) => item.status === "missing");
  const blocked = results.filter((item) => item.status === "blocked");
  const emptyOrFiltered = results.filter(
    (item) => item.status === "empty-or-filtered",
  );

  process.stdout.write(
    `\nAnon exposure checks: ${exposed.length} exposed, ${blocked.length} blocked, ${emptyOrFiltered.length} empty/filtered\n`,
  );

  for (const item of exposed) {
    process.stdout.write(
      `  - anon can read ${item.name} (${item.count} rows visible)\n`,
    );
  }

  for (const item of missing) {
    process.stdout.write(
      `  - anon check missing relation: ${item.name} (${summarizeError(item.error)})\n`,
    );
  }
}

function printSecurityContractResult(result) {
  process.stdout.write("\nSecurity contract checks:\n");

  if (result.status === "skipped") {
    process.stdout.write(`  - skipped: ${result.reason}\n`);
    return;
  }

  if (result.status !== "ok") {
    process.stdout.write(
      `  - failed: ${summarizeError(result.error)}\n`,
    );
    return;
  }

  const issueCount =
    result.missingRls.length +
    result.disabledRls.length +
    result.disabledPublicTables.length +
    result.anonGrants.length +
    result.missingBuckets.length +
    result.unexpectedPublicBuckets.length +
    result.unexpectedPrivateBuckets.length +
    result.missingStoragePolicies.length;

  if (issueCount === 0) {
    process.stdout.write(
      `  - OK ${RLS_RELATIONS.length} RLS tables (${CORE_RLS_RELATIONS.length} core, ${BUSINESS_RLS_RELATIONS.length} business), ${REQUIRED_STORAGE_BUCKETS.length} buckets, ${REQUIRED_STORAGE_POLICIES.length} storage policies\n`,
    );
    process.stdout.write("  - OK no public tables with RLS disabled\n");
    process.stdout.write(
      `  - OK storage privacy: ${EXPECTED_PRIVATE_STORAGE_BUCKETS.length} private, ${EXPECTED_PUBLIC_STORAGE_BUCKETS.length} public\n`,
    );
    return;
  }

  for (const table of result.missingRls) {
    process.stdout.write(`  - missing RLS table check: ${table}\n`);
  }
  for (const table of result.disabledRls) {
    process.stdout.write(`  - RLS disabled: ${table}\n`);
  }
  for (const table of result.disabledPublicTables) {
    process.stdout.write(`  - public table has RLS disabled: ${table}\n`);
  }
  for (const grant of result.anonGrants) {
    process.stdout.write(
      `  - anon grant remains: ${grant.table} ${grant.privilege}\n`,
    );
  }
  for (const bucket of result.missingBuckets) {
    process.stdout.write(`  - missing storage bucket: ${bucket}\n`);
  }
  for (const bucket of result.unexpectedPublicBuckets) {
    process.stdout.write(
      `  - sensitive storage bucket is unexpectedly public: ${bucket}\n`,
    );
  }
  for (const bucket of result.unexpectedPrivateBuckets) {
    process.stdout.write(
      `  - public storage bucket is unexpectedly private: ${bucket}\n`,
    );
  }
  for (const policy of result.missingStoragePolicies) {
    process.stdout.write(`  - missing storage policy: ${policy}\n`);
  }
}

async function main() {
  readEnvFiles();
  const { url, key, anonKey, usingServiceRole } = getSupabaseConfig();
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonSupabase = anonKey
    ? createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  process.stdout.write("FlowForce Supabase contract check\n");
  process.stdout.write(
    `Using ${usingServiceRole ? "service-role" : "anon"} Supabase key from environment.\n\n`,
  );

  const moduleResults = [];
  for (const moduleContract of REQUIRED_RELATIONS_BY_MODULE) {
    const uniqueRelations = [...new Set(moduleContract.relations)];
    const relations = [];
    for (const relation of uniqueRelations) {
      relations.push(await checkRelation(supabase, relation));
    }
    moduleResults.push({ module: moduleContract.module, relations });
  }

  const rpcResults = [];
  for (const rpc of READ_RPC_CHECKS) {
    rpcResults.push(await checkRpc(supabase, rpc));
  }

  const mutatingRpcResults = [];
  for (const rpc of MUTATING_RPC_EXISTENCE_CHECKS) {
    mutatingRpcResults.push(await checkRpcPresence(supabase, rpc));
  }

  const anonExposureResults = [];
  if (anonSupabase) {
    for (const relation of ANON_DENY_RELATIONS) {
      anonExposureResults.push(await checkAnonExposure(anonSupabase, relation));
    }
  }
  const securityContractResult = await checkSecurityContract(
    supabase,
    usingServiceRole,
  );

  printModuleResults(moduleResults);
  printRpcResults(rpcResults, mutatingRpcResults);
  if (anonSupabase) {
    printAnonExposureResults(anonExposureResults);
  } else {
    process.stdout.write(
      "\nAnon exposure checks skipped: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.\n",
    );
  }
  printSecurityContractResult(securityContractResult);

  const missingRelations = moduleResults.flatMap((result) =>
    result.relations.filter((item) => item.status === "missing"),
  );
  const relationErrors = moduleResults.flatMap((result) =>
    result.relations.filter((item) => item.status === "error"),
  );
  const missingRpcs = rpcResults.filter((item) => item.status === "missing");
  const rpcErrors = rpcResults.filter((item) => item.status === "error");
  const missingMutatingRpcs = mutatingRpcResults.filter(
    (item) => item.status === "missing",
  );
  const anonExposures = anonExposureResults.filter(
    (item) => item.status === "exposed",
  );
  const securityContractErrors =
    securityContractResult.status !== "ok"
      ? securityContractResult.status === "skipped"
        ? 0
        : 1
      : securityContractResult.missingRls.length +
        securityContractResult.disabledRls.length +
        securityContractResult.disabledPublicTables.length +
        securityContractResult.anonGrants.length +
        securityContractResult.missingBuckets.length +
        securityContractResult.unexpectedPublicBuckets.length +
        securityContractResult.unexpectedPrivateBuckets.length +
        securityContractResult.missingStoragePolicies.length;

  process.stdout.write(
    `\nSummary: ${missingRelations.length} missing relations, ${relationErrors.length} relation errors, ${missingRpcs.length} missing read RPCs, ${rpcErrors.length} read RPC errors, ${missingMutatingRpcs.length} missing mutating RPCs, ${anonExposures.length} anon exposures, ${securityContractErrors} security contract errors.\n`,
  );

  if (
    missingRelations.length > 0 ||
    relationErrors.length > 0 ||
    missingRpcs.length > 0 ||
    rpcErrors.length > 0 ||
    missingMutatingRpcs.length > 0 ||
    anonExposures.length > 0 ||
    securityContractErrors > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`Supabase contract check failed: ${error.message}\n`);
  process.exitCode = 1;
});
