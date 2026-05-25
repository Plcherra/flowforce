#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const MIGRATION_PATH = "supabase/migrations/20260513000100_restore_feature_schema.sql";
const REPORT_PATH = "docs/reports/phase-17-restore-domain-inventory-2026-05-24.md";

const DOMAINS = [
  {
    name: "core-tenant-auth",
    description: "Tenant identity, membership, permissions, settings, and audit.",
    patterns: [
      /^companies$/,
      /^company_(invites|members|roles|settings)$/,
      /^departments$/,
      /^positions$/,
      /^position_assignments$/,
      /^profiles$/,
      /^user_(companies|permissions|roles)$/,
      /^role_permissions$/,
      /^permission_audit_logs$/,
      /^audit_log$/,
      /^system_logs$/,
      /^org_prefs$/,
    ],
  },
  {
    name: "people-hr",
    description: "Employee records, reports, performance, compliance, and HR roster data.",
    patterns: [
      /^employees$/,
      /^employee_/,
      /^engagement_scores$/,
      /^performance_/,
      /^staff_(availability|performance)$/,
      /^hr_roster_cache$/,
      /^compliance_rules$/,
      /^skill_matrix$/,
    ],
  },
  {
    name: "scheduling-calendar",
    description: "Calendar, events, shifts, availability, time off, and vendor visits.",
    patterns: [
      /^calendar_/,
      /^events$/,
      /^event_/,
      /^schedule/,
      /^shift_/,
      /^availability_/,
      /^time_(entries|off_requests)$/,
      /^user_unavailability$/,
      /^supervisor_schedule$/,
      /^work_schedules$/,
      /^week_templates$/,
      /^vendor_(event|visits|sync_logs)$/,
    ],
  },
  {
    name: "messages-announcements",
    description: "Messages, channels, announcements, company updates, and notification surfaces.",
    patterns: [
      /^announcements?$/,
      /^announcement_reads$/,
      /^message/,
      /^channel_members$/,
      /^company_update/,
      /^reminders$/,
      /^task_notifications$/,
    ],
  },
  {
    name: "forms-sections-documents",
    description: "Forms, custom sections, documents, files, and generic attachments.",
    patterns: [
      /^forms?$/,
      /^form_/,
      /^custom_section/,
      /^section_templates$/,
      /^documents$/,
      /^files$/,
      /^attachments$/,
    ],
  },
  {
    name: "inventory-finance",
    description: "Inventory, purchasing, payments, budgets, expenses, labor, and sales data.",
    patterns: [
      /^inv_/,
      /^inventory_/,
      /^purchase_/,
      /^payments?$/,
      /^payment_/,
      /^budgets$/,
      /^expenses$/,
      /^sales_ledger$/,
      /^investment_plans$/,
      /^labor_entries$/,
    ],
  },
  {
    name: "learning-recognition-gamification",
    description: "Learning, training, badges, recognition, goals, and gamification.",
    patterns: [
      /^learning_/,
      /^training_/,
      /^certification/,
      /^badge_/,
      /^gamification_/,
      /^goal/,
      /^recognition/,
      /^recognitions$/,
      /^v_training_completion_events$/,
    ],
  },
  {
    name: "analytics-operations-copilot",
    description: "Analytics, operations, reports, workflow, ideas, OODA, and copilot data.",
    patterns: [
      /^analytics_/,
      /^app_rule/,
      /^codex_/,
      /^copilot_/,
      /^coverage_templates$/,
      /^custom_reports$/,
      /^daily_insights$/,
      /^helpdesk_tickets$/,
      /^idea_/,
      /^kpi_/,
      /^ooda_/,
      /^ops_/,
      /^operations_/,
      /^report_/,
      /^task_(activities|comments|workflow_instances)$/,
      /^tasks$/,
      /^workflow/,
    ],
  },
  {
    name: "system-internal",
    description: "Migration artifacts and implementation details that should not be client-owned.",
    patterns: [/^supabase_migrations$/],
  },
];

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function classify(name) {
  for (const domain of DOMAINS) {
    if (domain.patterns.some((pattern) => pattern.test(name))) {
      return domain.name;
    }
  }

  return "unclassified";
}

function collectMatches(text, regex, mapMatch) {
  const matches = [];
  for (const match of text.matchAll(regex)) {
    matches.push(mapMatch(match));
  }
  return matches;
}

function bullet(items, formatter = (item) => item) {
  if (items.length === 0) return "- None";
  return items.map((item) => `- ${formatter(item)}`).join("\n");
}

function main() {
  const text = readFileSync(MIGRATION_PATH, "utf8");
  const relations = collectMatches(
    text,
    /create\s+table\s+if\s+not\s+exists\s+public\."([^"]+)"\s*\(([^;]*)\);/gi,
    (match) => ({
      name: match[1],
      kind: "table",
      domain: classify(match[1]),
      line: lineNumberForIndex(text, match.index ?? 0),
      definition: match[2].trim(),
    }),
  );

  const viewMatches = collectMatches(
    text,
    /create\s+view\s+public\."([^"]+)"/gi,
    (match) => ({
      name: match[1],
      kind: "view",
      domain: classify(match[1]),
      line: lineNumberForIndex(text, match.index ?? 0),
    }),
  );

  const placeholderViews = collectMatches(
    text,
    /create\s+view\s+public\."([^"]+)"[\s\S]*?where\s+false/gi,
    (match) => ({
      name: match[1],
      domain: classify(match[1]),
      line: lineNumberForIndex(text, match.index ?? 0),
    }),
  );

  const broadGrants = collectMatches(
    text,
    /^(grant\s+(?:select|select,\s*insert,\s*update,\s*delete|all)\s+on\s+all\s+(?:tables|sequences)\s+in\s+schema\s+public\s+to\s+[^;]+;|alter\s+default\s+privileges\s+in\s+schema\s+public\s+grant\s+[^;]+;)/gim,
    (match) => ({
      statement: match[1].replace(/\s+/g, " ").trim(),
      line: lineNumberForIndex(text, match.index ?? 0),
    }),
  );

  const emptyShells = relations.filter((relation) => relation.definition === "");
  const allObjects = [...relations, ...viewMatches];
  const byDomain = new Map(
    [...DOMAINS.map((domain) => [domain.name, []]), ["unclassified", []]],
  );

  for (const object of allObjects) {
    byDomain.get(object.domain).push(object);
  }

  const reportLines = [
    "# Phase 17 - Restore Migration Domain Inventory",
    "",
    "Date: 2026-05-24",
    "",
    "## Goal",
    "",
    "Prepare the old restore migration for safe domain replacement without rewriting applied migration history blindly.",
    "",
    "## Source",
    "",
    `- Migration: \`${MIGRATION_PATH}\``,
    `- Tables found: ${relations.length}`,
    `- Placeholder views found: ${placeholderViews.length}`,
    `- Broad grant/default privilege statements found: ${broadGrants.length}`,
    `- Empty table shells found: ${emptyShells.length}`,
    "",
    "## Domain Inventory",
    "",
  ];

  for (const domain of DOMAINS) {
    const objects = byDomain.get(domain.name) ?? [];
    reportLines.push(`### ${domain.name}`);
    reportLines.push("");
    reportLines.push(domain.description);
    reportLines.push("");
    reportLines.push(`Objects: ${objects.length}`);
    reportLines.push("");
    reportLines.push(
      bullet(objects, (object) => `\`${object.name}\` (${object.kind}, line ${object.line})`),
    );
    reportLines.push("");
  }

  const unclassified = byDomain.get("unclassified") ?? [];
  reportLines.push("### unclassified");
  reportLines.push("");
  reportLines.push("Objects that need a human domain decision before the restore migration can be split.");
  reportLines.push("");
  reportLines.push(bullet(unclassified, (object) => `\`${object.name}\` (${object.kind}, line ${object.line})`));
  reportLines.push("");

  reportLines.push("## Blockers To Remove During Domain Replacement");
  reportLines.push("");
  reportLines.push("### Placeholder Views");
  reportLines.push("");
  reportLines.push(bullet(placeholderViews, (view) => `\`${view.name}\` (${view.domain}, line ${view.line})`));
  reportLines.push("");
  reportLines.push("### Empty Table Shells");
  reportLines.push("");
  reportLines.push(bullet(emptyShells, (table) => `\`${table.name}\` (${table.domain}, line ${table.line})`));
  reportLines.push("");
  reportLines.push("### Broad Grants And Default Privileges");
  reportLines.push("");
  reportLines.push(bullet(broadGrants, (grant) => `line ${grant.line}: \`${grant.statement}\``));
  reportLines.push("");
  reportLines.push("## Phase 17 Decision");
  reportLines.push("");
  reportLines.push("- Do not edit the already-applied restore migration in place for production.");
  reportLines.push("- Create forward domain migrations that replace placeholder views, add missing constraints, and move generic grants to explicit table policies.");
  reportLines.push("- Use this inventory as the checklist for replacing restore-migration ownership one domain at a time.");
  reportLines.push("- Keep release-gates and deploy-readiness green after each domain migration.");
  reportLines.push("");

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${reportLines.join("\n")}\n`);

  const unclassifiedCount = unclassified.length;
  process.stdout.write(
    `Restore domain inventory written to ${REPORT_PATH}. ${relations.length} tables, ${viewMatches.length} views, ${unclassifiedCount} unclassified.\n`,
  );
}

main();
