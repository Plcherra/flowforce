import type { AIPromptContractKey } from "./aiPromptContracts";

export type AILearningOutcome = "accepted" | "rejected";

export type AILearningReasonCode =
  | "useful"
  | "wrong_context"
  | "duplicate"
  | "unsafe"
  | "low_confidence"
  | "not_relevant"
  | "better_manual_action"
  | "policy_blocked"
  | "staledata"
  | "other";

export type AILearningSourceTable =
  | "ai_scheduling_suggestions"
  | "ai_inventorywaste_suggestions"
  | "ai_compliance_workflow_suggestions";

export interface AILearningFeedbackInput {
  companyId: string;
  sourceTable: AILearningSourceTable;
  sourceId: string;
  promptKey: AIPromptContractKey;
  suggestionType: string;
  outcome: AILearningOutcome;
  reasonCode: AILearningReasonCode | string;
  sourceStatus?: "approved" | "rejected" | "pending_review";
  sourcePriority?: "low" | "medium" | "high" | "critical";
  sourceTitle?: string;
}

export interface AILearningFeedbackRow {
  id: string;
  company_id: string;
  source_table: AILearningSourceTable;
  sourceid: string;
  prompt_key: AIPromptContractKey;
  suggestion_type: string;
  outcome: AILearningOutcome;
  reason_code: AILearningReasonCode;
  feedback_scope: "tenant";
  learning_fingerprint: string;
  no_cross_tenant_training: true;
  source_status: string | null;
  source_priority: string | null;
  source_title: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AILearningSummary {
  companyId: string;
  promptKey: AIPromptContractKey;
  suggestionType: string;
  totalFeedback: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
  topRejectionReason: AILearningReasonCode | null;
}

export const aiLearningReasonCodes: AILearningReasonCode[] = [
  "useful",
  "wrong_context",
  "duplicate",
  "unsafe",
  "low_confidence",
  "not_relevant",
  "better_manual_action",
  "policy_blocked",
  "staledata",
  "other",
];

export const aiLearningSourceTables: AILearningSourceTable[] = [
  "ai_scheduling_suggestions",
  "ai_inventorywaste_suggestions",
  "ai_compliance_workflow_suggestions",
];

export const aiLearningFeedbackTable = "ai_recommendation_feedback" as const;

export function normalizeAILearningReasonCode(reasonCode: string): AILearningReasonCode {
  const normalized = reasonCode.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return aiLearningReasonCodes.includes(normalized as AILearningReasonCode)
    ? (normalized as AILearningReasonCode)
    : "other";
}

export function buildAILearningFingerprint(input: Pick<
  AILearningFeedbackInput,
  "companyId" | "sourceTable" | "sourceId" | "promptKey" | "suggestionType"
>) {
  return [
    input.companyId,
    input.sourceTable,
    input.sourceId,
    input.promptKey,
    input.suggestionType,
  ].join(":");
}

export function buildAILearningSignal(input: AILearningFeedbackInput) {
  return {
    company_id: input.companyId,
    source_table: input.sourceTable,
    sourceid: input.sourceId,
    prompt_key: input.promptKey,
    suggestion_type: input.suggestionType,
    outcome: input.outcome,
    reason_code: normalizeAILearningReasonCode(input.reasonCode),
    feedback_scope: "tenant" as const,
    learning_fingerprint: buildAILearningFingerprint(input),
    no_cross_tenant_training: true as const,
    source_status: input.sourceStatus ?? null,
    source_priority: input.sourcePriority ?? null,
    source_title: input.sourceTitle ?? null,
  };
}

export function summarizeAILearningSignals(signals: AILearningFeedbackInput[]): AILearningSummary[] {
  const summaries = new Map<string, AILearningSummary>();

  for (const signal of signals) {
    const key = `${signal.companyId}:${signal.promptKey}:${signal.suggestionType}`;
    const summary =
      summaries.get(key) ??
      {
        companyId: signal.companyId,
        promptKey: signal.promptKey,
        suggestionType: signal.suggestionType,
        totalFeedback: 0,
        accepted: 0,
        rejected: 0,
        acceptanceRate: 0,
        topRejectionReason: null,
      };

    summary.totalFeedback += 1;
    if (signal.outcome === "accepted") {
      summary.accepted += 1;
    } else {
      summary.rejected += 1;
      summary.topRejectionReason = normalizeAILearningReasonCode(signal.reasonCode);
    }
    summary.acceptanceRate = summary.totalFeedback > 0 ? summary.accepted / summary.totalFeedback : 0;
    summaries.set(key, summary);
  }

  return [...summaries.values()];
}

export function buildAILearningAdjustment(summary: Pick<
  AILearningSummary,
  "accepted" | "rejected" | "acceptanceRate" | "topRejectionReason"
>) {
  if (summary.rejected >= 3 && summary.acceptanceRate <= 0.25) {
    return {
      recommendation: "deprioritize" as const,
      confidenceAdjustment: -0.15,
      reasonCode: summary.topRejectionReason ?? "other",
      feedbackScope: "tenant" as const,
    };
  }

  if (summary.accepted >= 3 && summary.acceptanceRate >= 0.75) {
    return {
      recommendation: "boost" as const,
      confidenceAdjustment: 0.1,
      reasonCode: "useful" as const,
      feedbackScope: "tenant" as const,
    };
  }

  return {
    recommendation: "neutral" as const,
    confidenceAdjustment: 0,
    reasonCode: summary.topRejectionReason ?? "other",
    feedbackScope: "tenant" as const,
  };
}

export function isAILearningFeedbackSafe(row: AILearningFeedbackRow) {
  return (
    aiLearningSourceTables.includes(row.source_table) &&
    aiLearningReasonCodes.includes(row.reason_code) &&
    row.feedback_scope === "tenant" &&
    row.no_cross_tenant_training === true &&
    row.learning_fingerprint.startsWith(`${row.company_id}:`)
  );
}
