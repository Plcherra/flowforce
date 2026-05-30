import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

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

const doc = readText("docs/ai-inventory-waste-assistant.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-06-inventory-and-waste-assistant-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000600_phase7_inventory_waste_assistant.sql",
);
const dbTest = readText(
  "supabase/tests/phase7_inventory_waste_assistant.test.sql",
);
const service = readText("src/services/ai/aiInventoryWasteAssistant.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "buildInventoryWasteSuggestions",
    "buildValidatedInventoryWasteAssistant",
    "buildInventoryAssistantDraft",
    "buildWasteAssistantDraft",
    "isInventoryWasteSuggestionSafe",
    "inventory_assistant",
    "waste_assistant",
    "stockout_risk",
    "reorder_review",
    "waste_outlier",
    "prep_adjustment",
    "writesAllowed: false",
  ],
  "AI inventory/waste assistant service",
);

requireIncludes(
  doc,
  [
    "refresh_ai_inventory_waste_suggestions(company_id)",
    "review_ai_inventory_waste_suggestion(suggestion_id, decision, comments)",
    "ai_inventory_waste_suggestions",
    "never writes inventory, purchasing, prep, or waste rows directly",
    "direct_write_executed",
  ],
  "AI inventory/waste assistant doc",
);

requireIncludes(
  migration,
  [
    "ai_inventory_waste_suggestions",
    "refresh_ai_inventory_waste_suggestions",
    "review_ai_inventory_waste_suggestion",
    "ai_inventory_waste_suggestions_latest_v",
    "ai_inventory_waste_assistant_readiness_v",
    "ai.inventory_waste_suggestion.created",
    "ai.inventory_waste_suggestion.approved",
    "direct_write_executed",
    "current_user_is_company_admin",
  ],
  "AI inventory/waste assistant migration",
);

requireIncludes(
  dbTest,
  [
    "tenant member can refresh inventory and waste suggestions",
    "inventory assistant detects stockout risk",
    "waste assistant detects waste outliers",
    "inventory and waste suggestions do not execute direct writes",
    "Tenant B cannot refresh Tenant A inventory and waste suggestions",
  ],
  "AI inventory/waste assistant DB test",
);

requireIncludes(
  auditEvents,
  [
    "aiInventoryWasteSuggestionCreated",
    "aiInventoryWasteSuggestionApproved",
    "aiInventoryWasteSuggestionRejected",
  ],
  "audit events",
);

requireIncludes(
  roadmap,
  [
    "Detect repeated stockouts.",
    "Suggest reorder quantities.",
    "Detect waste outliers.",
    "Suggest prep or purchasing adjustments.",
    "07.06 Inventory And Waste Assistant",
    "docs/ai-inventory-waste-assistant.md",
  ],
  "Plan 07 roadmap",
);

const phaseSixBlock = roadmap.match(
  /### Phase 6: Inventory And Waste Assistant[\s\S]*?### Phase 7:/,
)?.[0];

if (!phaseSixBlock || phaseSixBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 6 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "[x] 7.  AI copilot and automation",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "refresh_ai_inventory_waste_suggestions(company_id)",
    "review_ai_inventory_waste_suggestion(suggestion_id, decision, comments)",
    "approval-gated inventory and waste AI suggestions",
    "Phase 07.07: Compliance And Workflow Assistant",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-inventory-waste-assistant",
    "scripts/check-ai-inventory-waste-assistant-contract.mjs",
    "supabase/tests/phase7_inventory_waste_assistant.test.sql",
  ],
  "package scripts",
);

const inventoryWasteAssistant = await jiti.import(
  join(root, "src/services/ai/aiInventoryWasteAssistant.ts"),
);

const sampleSnapshot = {
  company_id: "sample-company",
  generated_at: "2026-05-29T12:00:00.000Z",
  module_count: 6,
  redaction: {
    raw_pii: "blocked",
    cross_tenant_data: "blocked",
  },
  modules: {
    scheduling: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["schedules"],
    },
    inventory: {
      summary: {
        active_items: 6,
        items_with_minimums: 2,
        prep_items: 1,
      },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["inv_items"],
    },
    tasks: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["tasks"],
    },
    forms: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["forms"],
    },
    employees: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["profiles"],
    },
    cost: {
      summary: {
        shortage_item_count: 3,
        overstock_item_count: 1,
        waste_cost: 120,
        purchasing_cost: 250,
        total_operating_cost: 800,
      },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["cost_day_location_summary_v"],
    },
  },
};

const result =
  inventoryWasteAssistant.buildValidatedInventoryWasteAssistant(sampleSnapshot);

if (!result.inventoryValidation.ok) {
  throw new Error(
    `Inventory assistant draft failed validation: ${result.inventoryValidation.issues.join("; ")}`,
  );
}

if (!result.wasteValidation.ok) {
  throw new Error(
    `Waste assistant draft failed validation: ${result.wasteValidation.issues.join("; ")}`,
  );
}

if (
  !result.suggestions.some((suggestion) => suggestion.type === "stockout_risk")
) {
  throw new Error("Inventory/waste assistant did not detect stockout risk");
}

if (
  !result.suggestions.some((suggestion) => suggestion.type === "waste_outlier")
) {
  throw new Error("Inventory/waste assistant did not detect waste outlier");
}

const safe = inventoryWasteAssistant.isInventoryWasteSuggestionSafe({
  id: "suggestion",
  company_id: "sample-company",
  prompt_key: "inventory_assistant",
  status: "pending_review",
  suggestion_type: "stockout_risk",
  priority: "medium",
  title: "Review repeated stockout risk",
  rationale: "Shortage signals need review.",
  suggested_action: {
    writes_allowed: false,
    requires_human_approval: true,
  },
  evidence: result.evidence,
  context_generated_at: "2026-05-29T12:00:00.000Z",
  approval_required: true,
  direct_write_executed: false,
  approved_by: null,
  approved_at: null,
  rejected_by: null,
  rejected_at: null,
  created_by: "user",
  created_at: "2026-05-29T12:00:00.000Z",
});

if (!safe) {
  throw new Error("Inventory/waste suggestion safety check failed");
}

process.stdout.write("OK AI inventory/waste assistant contract\n");
