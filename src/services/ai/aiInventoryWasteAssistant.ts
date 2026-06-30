import type { AIContextSnapshot, AIContextSnapshotModule } from "./aiContextLayer";
import { buildAIPromptContractInput, validateAIPromptOutput } from "./aiPromptContracts";

export type AIInventoryWastePromptKey = "inventory_assistant" | "waste_assistant";

export type AIInventoryWasteSuggestionType =
  | "stockout_risk"
  | "reorder_review"
  | "waste_outlier"
  | "prep_adjustment"
  | "purchasing_adjustment"
  | "no_action";

export type AIInventoryWasteSuggestionStatus = "pending_review" | "approved" | "rejected";
export type AIInventoryWasteSuggestionPriority = "low" | "medium" | "high" | "critical";

export interface AIInventoryWasteSuggestion {
  promptKey: AIInventoryWastePromptKey;
  type: AIInventoryWasteSuggestionType;
  title: string;
  rationale: string;
  priority: AIInventoryWasteSuggestionPriority;
  suggestedActionType: "request_review" | "draft_purchase_adjustment";
  evidenceRoute: string;
  requiresHumanApproval: true;
  writesAllowed: false;
}

export interface AIInventoryWasteSuggestionRow {
  id: string;
  company_id: string;
  prompt_key: AIInventoryWastePromptKey;
  status: AIInventoryWasteSuggestionStatus;
  suggestion_type: AIInventoryWasteSuggestionType;
  priority: AIInventoryWasteSuggestionPriority;
  title: string;
  rationale: string;
  suggested_action: Record<string, unknown>;
  evidence: Record<string, unknown>[];
  context_generated_at: string | null;
  approval_required: true;
  direct_write_executed: false;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
}

const inventoryRoute = "/app/inventory";
const inventoryReportsRoute = "/app/inventory/reports";
const purchasingRoute = "/app/inventory/purchasing";

const numberFromSummary = (module: AIContextSnapshotModule | undefined, key: string) => {
  const value = module?.summary?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export function buildInventoryWasteEvidence(snapshot: AIContextSnapshot) {
  return [
    {
      module: "inventory",
      metric: "active_items",
      value: snapshot.modules.inventory.summary.active_items ?? 0,
      route: inventoryRoute,
      freshness_at: snapshot.modules.inventory.freshness_at,
    },
    {
      module: "inventory",
      metric: "items_with_minimums",
      value: snapshot.modules.inventory.summary.items_with_minimums ?? 0,
      route: inventoryRoute,
      freshness_at: snapshot.modules.inventory.freshness_at,
    },
    {
      module: "cost",
      metric: "shortage_item_count",
      value: snapshot.modules.cost.summary.shortage_item_count ?? 0,
      route: inventoryReportsRoute,
      freshness_at: snapshot.modules.cost.freshness_at,
    },
    {
      module: "cost",
      metric: "waste_cost",
      value: snapshot.modules.cost.summary.waste_cost ?? 0,
      route: inventoryReportsRoute,
      freshness_at: snapshot.modules.cost.freshness_at,
    },
    {
      module: "cost",
      metric: "purchasing_cost",
      value: snapshot.modules.cost.summary.purchasing_cost ?? 0,
      route: purchasingRoute,
      freshness_at: snapshot.modules.cost.freshness_at,
    },
  ];
}

export function buildInventoryWasteSuggestions(snapshot: AIContextSnapshot): AIInventoryWasteSuggestion[] {
  const inventory = snapshot.modules.inventory;
  const cost = snapshot.modules.cost;
  const activeItems = numberFromSummary(inventory, "active_items");
  const itemsWithMinimums = numberFromSummary(inventory, "items_with_minimums");
  const prepItems = numberFromSummary(inventory, "prep_items");
  const shortageItemCount = numberFromSummary(cost, "shortage_item_count");
  const overstockItemCount = numberFromSummary(cost, "overstock_item_count");
  const wasteCost = numberFromSummary(cost, "waste_cost");
  const totalOperatingCost = numberFromSummary(cost, "total_operating_cost");
  const purchasingCost = numberFromSummary(cost, "purchasing_cost");
  const suggestions: AIInventoryWasteSuggestion[] = [];

  if (shortageItemCount > 0) {
    suggestions.push({
      promptKey: "inventory_assistant",
      type: "stockout_risk",
      title: "Review repeated stockout risk",
      rationale: `${shortageItemCount} inventory item${shortageItemCount === 1 ? "" : "s"} show shortage or stockout signals in the cost context.`,
      priority: shortageItemCount >= 3 ? "high" : "medium",
      suggestedActionType: "draft_purchase_adjustment",
      evidenceRoute: inventoryReportsRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (activeItems > 0 && itemsWithMinimums < activeItems) {
    suggestions.push({
      promptKey: "inventory_assistant",
      type: "reorder_review",
      title: "Review reorder thresholds",
      rationale: `${activeItems - itemsWithMinimums} active inventory item${activeItems - itemsWithMinimums === 1 ? "" : "s"} do not have minimum stock thresholds.`,
      priority: activeItems - itemsWithMinimums >= 5 ? "high" : "medium",
      suggestedActionType: "draft_purchase_adjustment",
      evidenceRoute: inventoryRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (wasteCost > 0 && (totalOperatingCost === 0 || wasteCost / totalOperatingCost >= 0.1)) {
    suggestions.push({
      promptKey: "waste_assistant",
      type: "waste_outlier",
      title: "Review waste outlier",
      rationale: "Recent waste cost is high enough to require manager review.",
      priority: totalOperatingCost > 0 && wasteCost / totalOperatingCost >= 0.2 ? "high" : "medium",
      suggestedActionType: "request_review",
      evidenceRoute: inventoryReportsRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (prepItems > 0 && wasteCost > 0) {
    suggestions.push({
      promptKey: "waste_assistant",
      type: "prep_adjustment",
      title: "Review prep adjustment",
      rationale: "Prep items and waste cost are both present, so prep quantity or timing may need review.",
      priority: "medium",
      suggestedActionType: "request_review",
      evidenceRoute: inventoryRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (purchasingCost > 0 && overstockItemCount > 0) {
    suggestions.push({
      promptKey: "inventory_assistant",
      type: "purchasing_adjustment",
      title: "Review purchasing adjustment",
      rationale: `${overstockItemCount} inventory item${overstockItemCount === 1 ? "" : "s"} show overstock while purchasing cost is present.`,
      priority: "medium",
      suggestedActionType: "draft_purchase_adjustment",
      evidenceRoute: purchasingRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      promptKey: "inventory_assistant",
      type: "no_action",
      title: "No inventory or waste action needed",
      rationale: "No immediate stockout, reorder, waste, prep, or purchasing risk was detected.",
      priority: "low",
      suggestedActionType: "request_review",
      evidenceRoute: inventoryRoute,
      requiresHumanApproval: true,
      writesAllowed: false,
    });
  }

  return suggestions.slice(0, 8);
}

function buildContractEvidence(snapshot: AIContextSnapshot) {
  return buildInventoryWasteEvidence(snapshot).map((item) => ({
    module: item.module,
    metric: item.metric,
    value: item.value,
    freshness_at: item.freshness_at,
  }));
}

export function buildInventoryAssistantDraft(snapshot: AIContextSnapshot) {
  const suggestions = buildInventoryWasteSuggestions(snapshot);
  const inventorySuggestions = suggestions.filter((suggestion) => suggestion.promptKey === "inventory_assistant");
  const activeSuggestions = inventorySuggestions.filter((suggestion) => suggestion.type !== "no_action");

  return {
    contract_version: "2026-05-29" as const,
    prompt_key: "inventory_assistant" as const,
    generated_at: new Date().toISOString(),
    status: activeSuggestions.length > 0 ? ("ok" as const) : ("no_action" as const),
    summary:
      activeSuggestions.length > 0
        ? `${activeSuggestions.length} inventory suggestion${activeSuggestions.length === 1 ? "" : "s"} need manager review.`
        : "No immediate inventory action was detected from the current tenant context.",
    confidence: activeSuggestions.length > 0 ? 0.74 : 0.62,
    evidence: buildContractEvidence(snapshot),
    recommendations: inventorySuggestions.map((suggestion) => ({
      title: suggestion.title,
      rationale: suggestion.rationale,
      priority: suggestion.priority,
      suggested_action_type: suggestion.suggestedActionType,
      requires_human_approval: true as const,
    })),
    safety: {
      requires_human_approval: true as const,
      writes_allowed: false as const,
      blockeddata_classes_observed: [],
    },
    stock_risks: activeSuggestions.map((suggestion) => ({
      risk: suggestion.rationale,
      severity: suggestion.priority,
      metric: suggestion.type,
    })),
    reorder_suggestions: inventorySuggestions.map((suggestion) => ({
      item_group: "tenant inventory summary",
      suggestion: suggestion.title,
      urgency: suggestion.priority,
    })),
  };
}

export function buildWasteAssistantDraft(snapshot: AIContextSnapshot) {
  const suggestions = buildInventoryWasteSuggestions(snapshot);
  const wasteSuggestions = suggestions.filter((suggestion) => suggestion.promptKey === "waste_assistant");

  return {
    contract_version: "2026-05-29" as const,
    prompt_key: "waste_assistant" as const,
    generated_at: new Date().toISOString(),
    status: wasteSuggestions.length > 0 ? ("ok" as const) : ("no_action" as const),
    summary:
      wasteSuggestions.length > 0
        ? `${wasteSuggestions.length} waste suggestion${wasteSuggestions.length === 1 ? "" : "s"} need manager review.`
        : "No immediate waste action was detected from the current tenant context.",
    confidence: wasteSuggestions.length > 0 ? 0.73 : 0.61,
    evidence: buildContractEvidence(snapshot),
    recommendations: wasteSuggestions.map((suggestion) => ({
      title: suggestion.title,
      rationale: suggestion.rationale,
      priority: suggestion.priority,
      suggested_action_type: suggestion.suggestedActionType,
      requires_human_approval: true as const,
    })),
    safety: {
      requires_human_approval: true as const,
      writes_allowed: false as const,
      blockeddata_classes_observed: [],
    },
    waste_outliers: wasteSuggestions.map((suggestion) => ({
      pattern: suggestion.rationale,
      severity: suggestion.priority,
      cost_signal: suggestion.type,
    })),
    adjustment_suggestions: wasteSuggestions.map((suggestion) => ({
      title: suggestion.title,
      rationale: suggestion.rationale,
      priority: suggestion.priority,
      suggested_action_type: suggestion.suggestedActionType,
      requires_human_approval: true as const,
    })),
  };
}

export function buildValidatedInventoryWasteAssistant(snapshot: AIContextSnapshot) {
  const inventoryPromptInput = buildAIPromptContractInput("inventory_assistant", snapshot);
  const wastePromptInput = buildAIPromptContractInput("waste_assistant", snapshot);
  const inventoryDraft = buildInventoryAssistantDraft(snapshot);
  const wasteDraft = buildWasteAssistantDraft(snapshot);

  return {
    inventoryPromptInput,
    wastePromptInput,
    evidence: buildInventoryWasteEvidence(snapshot),
    suggestions: buildInventoryWasteSuggestions(snapshot),
    inventoryValidation: validateAIPromptOutput("inventory_assistant", inventoryDraft),
    wasteValidation: validateAIPromptOutput("waste_assistant", wasteDraft),
  };
}

export function isInventoryWasteSuggestionSafe(row: AIInventoryWasteSuggestionRow) {
  return (
    (row.prompt_key === "inventory_assistant" || row.prompt_key === "waste_assistant") &&
    row.approval_required === true &&
    row.direct_write_executed === false &&
    row.suggested_action?.writes_allowed === false &&
    row.suggested_action?.requires_human_approval === true
  );
}
