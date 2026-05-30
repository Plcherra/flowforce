import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const doc = readText("docs/sop-checklist-builder.md");
const roadmap = readText(
  "docs/roadmap/06-operations-workflows-and-compliance.md",
);
const report = readText(
  "docs/roadmap/reports/06-02-sop-and-checklist-builder-2026-05-28.md",
);
const migration = readText(
  "supabase/migrations/20260528001300_phase6_sop_checklist_builder.sql",
);
const service = readText("src/services/operations/sopChecklistBuilder.ts");
const panel = readText(
  "src/features/operations/components/SopChecklistBuilderPanel.tsx",
);
const hub = readText("src/features/operations/components/OperationsHub.tsx");
const dbTest = readText("supabase/tests/phase6_sop_checklist_builder.test.sql");
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "create_sop_checklist_template",
    "insert into public.forms",
    "insert into public.form_fields",
    "insert into public.workflows",
    "insert into public.workflow_steps",
    "insert into public.workflow_assignments",
    "sop_checklist_builder_templates_v",
    "current_user_company_ids()",
  ],
  "SOP checklist builder migration",
);

requireIncludes(
  service,
  [
    "sopChecklistTemplatePresets",
    "Opening Checklist",
    "Closing Checklist",
    "Cleaning Routine",
    "Safety Inspection",
    "Inventory Count Routine",
    "buildSopChecklistRpcPayload",
  ],
  "SOP checklist builder service",
);

requireIncludes(
  panel,
  [
    "SopChecklistBuilderPanel",
    "create_sop_checklist_template",
    "buildSopChecklistRpcPayload",
    "Publish",
  ],
  "SOP checklist builder panel",
);

requireIncludes(hub, ["SopChecklistBuilderPanel"], "Operations Hub");

requireIncludes(
  doc,
  [
    "Opening",
    "Closing",
    "Cleaning",
    "Safety",
    "Inventory",
    "A published template must create both a form schema and an executable workflow template.",
  ],
  "SOP checklist builder doc",
);

requireIncludes(
  roadmap,
  [
    "Create template builder for opening, closing, cleaning, safety, and inventory routines.",
    "Support required fields, attachments, signatures, ratings, and scans.",
    "Support location/role assignment.",
    "Add preview mode.",
    "06.02 SOP And Checklist Builder",
    "docs/sop-checklist-builder.md",
  ],
  "Plan 06 roadmap",
);

const phaseTwoBlock = roadmap.match(
  /### Phase 2: SOP And Checklist Builder[\s\S]*?### Phase 3:/,
)?.[0];

if (!phaseTwoBlock || phaseTwoBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 2 still has unchecked tasks");
}

requireIncludes(
  dbTest,
  [
    "create_sop_checklist_template",
    "published form is created",
    "workflow steps are linked to generated form fields",
    "Tenant B cannot call builder for Tenant A",
  ],
  "SOP checklist builder DB test",
);

requireIncludes(
  report,
  ["create_sop_checklist_template", "SopChecklistBuilderPanel", "Phase 06.03"],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:sop-checklist-builder",
    "scripts/check-sop-checklist-builder-contract.mjs",
    "supabase/tests/phase6_sop_checklist_builder.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK SOP checklist builder contract\n");
