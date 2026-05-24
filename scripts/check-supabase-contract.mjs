#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_RELATIONS_BY_MODULE = [
  {
    module: "Core / onboarding",
    relations: ["companies", "profiles"],
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

const MUTATING_RPC_CHECKS = [
  "assert_company_membership",
  "create_company_invite",
  "create_company_with_setup",
  "log_audit_event",
  "replace_event_participants",
  "replace_event_shift_links",
  "trigger_onboarding_checklist",
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
  const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, key, usingServiceRole };
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
  const { error } = await supabase.rpc(rpc.name, rpc.args, { head: true });

  if (!error) {
    return { name: rpc.name, status: "ok" };
  }

  if (isMissingRpcError(error, rpc.name)) {
    return { name: rpc.name, status: "missing", error };
  }

  return { name: rpc.name, status: "error", error };
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

function printRpcResults(results) {
  const missing = results.filter((item) => item.status === "missing");
  const errors = results.filter((item) => item.status === "error");
  const ok = results.filter((item) => item.status === "ok");

  process.stdout.write(`\nRead RPC checks: ${ok.length}/${results.length} ok\n`);

  for (const item of missing) {
    process.stdout.write(`  - missing RPC: ${item.name}\n`);
  }

  for (const item of errors) {
    process.stdout.write(
      `  - RPC error: ${item.name} (${summarizeError(item.error)})\n`,
    );
  }

  process.stdout.write("\nSkipped mutating RPC checks:\n");
  for (const name of MUTATING_RPC_CHECKS) {
    process.stdout.write(`  - ${name}\n`);
  }
}

async function main() {
  readEnvFiles();
  const { url, key, usingServiceRole } = getSupabaseConfig();
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  printModuleResults(moduleResults);
  printRpcResults(rpcResults);

  const missingRelations = moduleResults.flatMap((result) =>
    result.relations.filter((item) => item.status === "missing"),
  );
  const relationErrors = moduleResults.flatMap((result) =>
    result.relations.filter((item) => item.status === "error"),
  );
  const missingRpcs = rpcResults.filter((item) => item.status === "missing");
  const rpcErrors = rpcResults.filter((item) => item.status === "error");

  process.stdout.write(
    `\nSummary: ${missingRelations.length} missing relations, ${relationErrors.length} relation errors, ${missingRpcs.length} missing read RPCs, ${rpcErrors.length} read RPC errors.\n`,
  );

  if (
    missingRelations.length > 0 ||
    relationErrors.length > 0 ||
    missingRpcs.length > 0 ||
    rpcErrors.length > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`Supabase contract check failed: ${error.message}\n`);
  process.exitCode = 1;
});
