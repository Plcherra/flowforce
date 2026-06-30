import { z } from "zod";

import type { AIContextModuleKey, AIContextSnapshot } from "./aiContextLayer";

export type AIPromptContractKey =
  | "scheduling_assistant"
  | "inventory_assistant"
  | "waste_assistant"
  | "compliance_assistant"
  | "manager_briefing";

export type AIPromptPriority = "low" | "medium" | "high" | "critical";

export interface AIPromptContractDefinition {
  key: AIPromptContractKey;
  label: string;
  purpose: string;
  requiredContextModules: AIContextModuleKey[];
  outputSchemaVersion: "2026-05-29";
  actionLevel: "read_only_insight" | "suggested_action";
  fallbackBehavior: string;
}

export interface AIPromptValidationSuccess<TOutput = unknown> {
  ok: true;
  promptKey: AIPromptContractKey;
  data: TOutput;
}

export interface AIPromptValidationFailure {
  ok: false;
  promptKey: AIPromptContractKey;
  issues: string[];
  fallback: AIPromptFallbackOutput;
}

export interface AIPromptFallbackOutput {
  contract_version: "2026-05-29";
  prompt_key: AIPromptContractKey;
  status: "fallback";
  summary: string;
  confidence: 0;
  evidence: [];
  recommendations: [];
  safety: {
    requires_human_approval: true;
    writes_allowed: false;
    fallback_reason: string;
  };
}

const prioritySchema = z.enum(["low", "medium", "high", "critical"]);

const evidenceSchema = z
  .object({
    module: z.enum(["scheduling", "inventory", "tasks", "forms", "employees", "cost", "operations"]),
    metric: z.string().min(1).max(120),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    freshness_at: z.string().min(1),
  })
  .strict();

const recommendationSchema = z
  .object({
    title: z.string().min(1).max(140),
    rationale: z.string().min(1).max(900),
    priority: prioritySchema,
    suggested_action_type: z.enum([
      "none",
      "create_task",
      "request_review",
      "draft_schedule_change",
      "draft_purchase_adjustment",
      "draft_training_followup",
    ]),
    requires_human_approval: z.literal(true),
  })
  .strict();

const safetySchema = z
  .object({
    requires_human_approval: z.literal(true),
    writes_allowed: z.literal(false),
    blocked_data_classes_observed: z.array(z.string()).default([]),
  })
  .strict();

const basePromptSchema = z
  .object({
    contract_version: z.literal("2026-05-29"),
    generated_at: z.string().min(1),
    status: z.enum(["ok", "partial", "no_action"]),
    summary: z.string().min(1).max(1200),
    confidence: z.number().min(0).max(1),
    evidence: z.array(evidenceSchema).max(12),
    recommendations: z.array(recommendationSchema).max(8),
    safety: safetySchema,
  })
  .strict();

const schedulingPromptSchema = basePromptSchema
  .extend({
    prompt_key: z.literal("scheduling_assistant"),
    staffing_risks: z
      .array(
        z
          .object({
            risk: z.string().min(1).max(180),
            severity: prioritySchema,
            affected_window: z.string().min(1).max(160),
          })
          .strict(),
      )
      .max(8),
    shift_suggestions: z
      .array(
        z
          .object({
            suggestion: z.string().min(1).max(220),
            expected_impact: z.string().min(1).max(300),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();

const inventoryPromptSchema = basePromptSchema
  .extend({
    prompt_key: z.literal("inventory_assistant"),
    stock_risks: z
      .array(
        z
          .object({
            risk: z.string().min(1).max(180),
            severity: prioritySchema,
            metric: z.string().min(1).max(120),
          })
          .strict(),
      )
      .max(8),
    reorder_suggestions: z
      .array(
        z
          .object({
            item_group: z.string().min(1).max(120),
            suggestion: z.string().min(1).max(220),
            urgency: prioritySchema,
          })
          .strict(),
      )
      .max(8),
  })
  .strict();

const wastePromptSchema = basePromptSchema
  .extend({
    prompt_key: z.literal("waste_assistant"),
    waste_outliers: z
      .array(
        z
          .object({
            pattern: z.string().min(1).max(180),
            severity: prioritySchema,
            cost_signal: z.string().min(1).max(120),
          })
          .strict(),
      )
      .max(8),
    adjustment_suggestions: z.array(recommendationSchema).max(8),
  })
  .strict();

const compliancePromptSchema = basePromptSchema
  .extend({
    prompt_key: z.literal("compliance_assistant"),
    workflow_risks: z
      .array(
        z
          .object({
            workflow_area: z.string().min(1).max(140),
            risk: z.string().min(1).max(220),
            severity: prioritySchema,
          })
          .strict(),
      )
      .max(8),
    corrective_tasks: z.array(recommendationSchema).max(8),
  })
  .strict();

const managerBriefingPromptSchema = basePromptSchema
  .extend({
    prompt_key: z.literal("manager_briefing"),
    briefing_sections: z
      .array(
        z
          .object({
            heading: z.string().min(1).max(120),
            bullets: z.array(z.string().min(1).max(240)).min(1).max(5),
          })
          .strict(),
      )
      .min(1)
      .max(6),
    top_risks: z
      .array(
        z
          .object({
            risk: z.string().min(1).max(180),
            priority: prioritySchema,
            owner_hint: z.enum(["manager", "inventory", "scheduler", "compliance", "team"]),
          })
          .strict(),
      )
      .max(8),
    next_actions: z.array(recommendationSchema).max(8),
  })
  .strict();

export const aiPromptContractDefinitions: AIPromptContractDefinition[] = [
  {
    key: "scheduling_assistant",
    label: "Scheduling Assistant",
    purpose: "Detect staffing risk and draft schedule-change suggestions.",
    requiredContextModules: ["scheduling", "employees", "cost", "tasks"],
    outputSchemaVersion: "2026-05-29",
    actionLevel: "suggested_action",
    fallbackBehavior: "Return no-action scheduling fallback and require manager review.",
  },
  {
    key: "inventory_assistant",
    label: "Inventory Assistant",
    purpose: "Detect stock risk and draft reorder or prep adjustments.",
    requiredContextModules: ["inventory", "cost", "tasks"],
    outputSchemaVersion: "2026-05-29",
    actionLevel: "suggested_action",
    fallbackBehavior: "Return no-action inventory fallback and require manager review.",
  },
  {
    key: "waste_assistant",
    label: "Waste Assistant",
    purpose: "Detect waste outliers and suggest cost-control follow-ups.",
    requiredContextModules: ["inventory", "cost", "tasks"],
    outputSchemaVersion: "2026-05-29",
    actionLevel: "suggested_action",
    fallbackBehavior: "Return no-action waste fallback and require manager review.",
  },
  {
    key: "compliance_assistant",
    label: "Compliance Assistant",
    purpose: "Detect workflow/compliance gaps and suggest corrective tasks.",
    requiredContextModules: ["tasks", "forms", "employees"],
    outputSchemaVersion: "2026-05-29",
    actionLevel: "suggested_action",
    fallbackBehavior: "Return no-action compliance fallback and require manager review.",
  },
  {
    key: "manager_briefing",
    label: "Manager Briefing",
    purpose: "Summarize today's operational risks and next best actions.",
    requiredContextModules: ["scheduling", "inventory", "tasks", "forms", "employees", "cost"],
    outputSchemaVersion: "2026-05-29",
    actionLevel: "read_only_insight",
    fallbackBehavior: "Return a read-only briefing fallback with no recommendations.",
  },
];

export const aiPromptOutputSchemas = {
  scheduling_assistant: schedulingPromptSchema,
  inventory_assistant: inventoryPromptSchema,
  waste_assistant: wastePromptSchema,
  compliance_assistant: compliancePromptSchema,
  manager_briefing: managerBriefingPromptSchema,
} satisfies Record<AIPromptContractKey, z.ZodTypeAny>;

export const aiPromptSystemInstructions = [
  "You are FlowForce AI. Use only the provided tenant-scoped context snapshot.",
  "Return JSON only. Do not include markdown, prose outside JSON, or unrequested keys.",
  "Do not reveal names, emails, phones, addresses, secrets, payroll detail, or raw free text.",
  "Do not invent record IDs, people, locations, item names, or exact money values that are not present as aggregate context.",
  "All suggested writes must set requires_human_approval to true and writes_allowed to false.",
] as const;

export function buildAIPromptContractInput(
  promptKey: AIPromptContractKey,
  contextSnapshot: AIContextSnapshot,
) {
  const definition = aiPromptContractDefinitions.find((contract) => contract.key === promptKey);

  if (!definition) {
    throw new Error(`Unknown AI prompt contract: ${promptKey}`);
  }

  return {
    prompt_key: promptKey,
    contract_version: definition.outputSchemaVersion,
    system: aiPromptSystemInstructions,
    required_contextmodules: definition.requiredContextModules,
    context_snapshot: contextSnapshot,
    output_requirements: {
      json_only: true,
      strict_schema: true,
      fallback_on_invalid_output: true,
      writes_allowed: false,
      requires_human_approval_for_suggestions: true,
    },
  };
}

export function createAIPromptFallback(
  promptKey: AIPromptContractKey,
  fallbackReason: string,
): AIPromptFallbackOutput {
  return {
    contract_version: "2026-05-29",
    prompt_key: promptKey,
    status: "fallback",
    summary: "AI output could not be safely validated. No action was created.",
    confidence: 0,
    evidence: [],
    recommendations: [],
    safety: {
      requires_human_approval: true,
      writes_allowed: false,
      fallback_reason: fallbackReason,
    },
  };
}

export function validateAIPromptOutput<TPromptKey extends AIPromptContractKey>(
  promptKey: TPromptKey,
  output: unknown,
): AIPromptValidationSuccess<z.infer<(typeof aiPromptOutputSchemas)[TPromptKey]>> | AIPromptValidationFailure {
  const schema = aiPromptOutputSchemas[promptKey];
  const parsed = schema.safeParse(output);

  if (!parsed.success) {
    return {
      ok: false,
      promptKey,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
      fallback: createAIPromptFallback(promptKey, "schema_validation_failed"),
    };
  }

  return {
    ok: true,
    promptKey,
    data: parsed.data as z.infer<(typeof aiPromptOutputSchemas)[TPromptKey]>,
  };
}

export function hasPromptContractCoverage() {
  const keys = new Set(aiPromptContractDefinitions.map((contract) => contract.key));
  return (
    keys.has("scheduling_assistant") &&
    keys.has("inventory_assistant") &&
    keys.has("waste_assistant") &&
    keys.has("compliance_assistant") &&
    keys.has("manager_briefing")
  );
}
