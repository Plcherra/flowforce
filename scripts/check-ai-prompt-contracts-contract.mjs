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

const doc = readText("docs/ai-prompt-contracts.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-03-prompt-contracts-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000300_phase7_prompt_contract_registry.sql",
);
const dbTest = readText(
  "supabase/tests/phase7_prompt_contract_registry.test.sql",
);
const service = readText("src/services/ai/aiPromptContracts.ts");
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "scheduling_assistant",
    "inventory_assistant",
    "waste_assistant",
    "compliance_assistant",
    "manager_briefing",
    "validateAIPromptOutput",
    "createAIPromptFallback",
    "safeParse",
    "writes_allowed",
    "requires_human_approval",
  ],
  "AI prompt contract service",
);

requireIncludes(
  doc,
  [
    "JSON-only output",
    "Strict schema validation",
    "validateAIPromptOutput(promptKey, output)",
    "Invalid output is not repaired silently",
    "writes_allowed: false",
  ],
  "AI prompt contract doc",
);

requireIncludes(
  migration,
  [
    "ai_prompt_contracts_v",
    "ai_prompt_contract_readiness_v",
    "scheduling_assistant",
    "inventory_assistant",
    "waste_assistant",
    "compliance_assistant",
    "manager_briefing",
    "requires_json_output",
    "fallback_behavior",
  ],
  "AI prompt registry migration",
);

requireIncludes(
  dbTest,
  [
    "prompt contract registry exposes five contracts",
    "all prompt contracts require JSON output",
    "all prompt contracts declare fallback behavior",
    "prompt contract readiness is complete",
  ],
  "AI prompt registry DB test",
);

requireIncludes(
  roadmap,
  [
    "Create prompts for scheduling, inventory, waste, compliance, and manager briefing.",
    "Require structured JSON output.",
    "Add schema validation.",
    "Add failure and fallback behavior.",
    "07.03 Prompt Contracts",
    "docs/ai-prompt-contracts.md",
  ],
  "Plan 07 roadmap",
);

const phaseThreeBlock = roadmap.match(
  /### Phase 3: Prompt Contracts[\s\S]*?### Phase 4:/,
)?.[0];

if (!phaseThreeBlock || phaseThreeBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 3 still has unchecked tasks");
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
    "validateAIPromptOutput(promptKey, output)",
    "ai_prompt_contracts_v",
    "invalid-output rejection",
    "Phase 07.04: Manager Briefing",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-prompt-contracts",
    "scripts/check-ai-prompt-contracts-contract.mjs",
    "supabase/tests/phase7_prompt_contract_registry.test.sql",
  ],
  "package scripts",
);

const promptContracts = await jiti.import(
  join(root, "src/services/ai/aiPromptContracts.ts"),
);

if (!promptContracts.hasPromptContractCoverage()) {
  throw new Error("AI prompt contracts do not cover all required prompt keys");
}

const validSchedulingOutput = {
  contract_version: "2026-05-29",
  prompt_key: "scheduling_assistant",
  generated_at: "2026-05-29T12:00:00.000Z",
  status: "ok",
  summary: "Staffing looks tight in one window.",
  confidence: 0.72,
  evidence: [
    {
      module: "scheduling",
      metric: "unassigned_shifts",
      value: 1,
      freshness_at: "2026-05-29T12:00:00.000Z",
    },
  ],
  recommendations: [
    {
      title: "Review open shift coverage",
      rationale: "One shift is unassigned in the scheduling summary.",
      priority: "medium",
      suggested_action_type: "request_review",
      requires_human_approval: true,
    },
  ],
  safety: {
    requires_human_approval: true,
    writes_allowed: false,
    blocked_data_classes_observed: [],
  },
  staffing_risks: [
    {
      risk: "Unassigned shift detected",
      severity: "medium",
      affected_window: "next scheduled window",
    },
  ],
  shift_suggestions: [
    {
      suggestion: "Ask a manager to review coverage.",
      expected_impact: "Reduces missed-shift risk.",
    },
  ],
};

const validResult = promptContracts.validateAIPromptOutput(
  "scheduling_assistant",
  validSchedulingOutput,
);

if (!validResult.ok) {
  throw new Error(
    `Valid AI prompt output was rejected: ${validResult.issues.join("; ")}`,
  );
}

const invalidResult = promptContracts.validateAIPromptOutput(
  "scheduling_assistant",
  {
    prompt_key: "scheduling_assistant",
    summary: "Please create a schedule change.",
    safety: {
      requires_human_approval: false,
      writes_allowed: true,
    },
  },
);

if (invalidResult.ok) {
  throw new Error("Invalid AI prompt output was accepted");
}

if (
  invalidResult.fallback.status !== "fallback" ||
  invalidResult.fallback.safety.writes_allowed !== false ||
  invalidResult.fallback.safety.requires_human_approval !== true
) {
  throw new Error("Invalid AI prompt output did not produce a safe fallback");
}

process.stdout.write("OK AI prompt contracts\n");
