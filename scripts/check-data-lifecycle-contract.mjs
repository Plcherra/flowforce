import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const fail = (message) => {
  throw new Error(`[data-lifecycle-contract] ${message}`);
};

const assertIncludes = (text, pattern, message) => {
  if (!text.includes(pattern)) fail(message);
};

const policy = readText("src/services/lifecycle/dataLifecyclePolicy.ts");
const migration = readText(
  "supabase/migrations/20260527000300_phase3_data_lifecycle_contract.sql",
);
const docs = readText("docs/data-lifecycle-and-retention.md");
const roadmap = readText("docs/roadmap/03-core-saas-foundation.md");

for (const status of [
  "active",
  "archive_pending",
  "archived",
  "delete_pending",
  "deleted",
  "legal_hold",
]) {
  assertIncludes(policy, `"${status}"`, `policy must define ${status}`);
  assertIncludes(migration, `'${status}'`, `migration must allow ${status}`);
  assertIncludes(docs, `\`${status}\``, `docs must explain ${status}`);
}

for (const table of [
  "companies",
  "profiles",
  "company_members",
  "tasks",
  "messages",
  "forms",
  "form_submissions",
  "documents",
  "expenses",
  "payments",
  "inventory_items",
  "inv_items",
  "schedules",
  "audit_log",
]) {
  assertIncludes(policy, `table: "${table}"`, `policy must cover ${table}`);
  assertIncludes(migration, `'${table}'`, `migration must manage ${table}`);
}

for (const field of [
  "lifecycle_status",
  "archived_at",
  "deleted_at",
  "retention_hold_until",
]) {
  assertIncludes(migration, field, `migration must add ${field}`);
  assertIncludes(docs, `\`${field}\``, `docs must describe ${field}`);
}

for (const relation of ["company_data_exports", "lifecycle_legal_holds"]) {
  assertIncludes(migration, relation, `migration must create ${relation}`);
  assertIncludes(docs, relation, `docs must explain ${relation}`);
}

for (const retentionClass of [
  "tenant_configuration",
  "employee_profile",
  "operational_record",
  "financial_record",
  "audit_record",
  "generated_report",
  "system_cache",
]) {
  assertIncludes(
    policy,
    `"${retentionClass}"`,
    `policy must define ${retentionClass}`,
  );
}

assertIncludes(
  docs,
  "Company exports are tracked",
  "docs must include the company export plan",
);
assertIncludes(
  docs,
  "Legal holds are tracked",
  "docs must include legal hold rules",
);
assertIncludes(
  docs,
  "Restore is allowed",
  "docs must include restore behavior",
);
assertIncludes(
  roadmap,
  "03.07 Data Lifecycle And Retention",
  "phase 03.07 report must be linked",
);
console.log("OK data lifecycle contract: policy, migration, docs, roadmap");
