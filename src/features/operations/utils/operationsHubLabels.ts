import type { SopChecklistTemplateDraft } from "@/services/operations/sopChecklistBuilder";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function suffix(id: string) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function localizedSopTemplate(
  t: Translate,
  template: SopChecklistTemplateDraft,
): SopChecklistTemplateDraft {
  const id = suffix(template.id);
  return {
    ...template,
    name: t(`operations.sop${id}Name`),
    description: t(`operations.sop${id}Description`),
    steps: template.steps.map((step, index) => ({
      ...step,
      label: t(`operations.sop${id}Step${index}`),
    })),
  };
}

export function sopCategoryLabel(t: Translate, category: string) {
  return t(`operations.sopCategory${suffix(category)}`);
}

const CALENDAR_SUFFIX: Record<string, string> = {
  "daily-opening": "DailyOpening",
  "daily-closing": "DailyClosing",
  "weekly-safety": "WeeklySafety",
};

export function calendarPresetLabel(t: Translate, id: string) {
  return t(`operations.calendar${CALENDAR_SUFFIX[id] ?? "DailyOpening"}Label`);
}

export function calendarPresetDescription(t: Translate, id: string) {
  return t(`operations.calendar${CALENDAR_SUFFIX[id] ?? "DailyOpening"}Description`);
}

export function calendarPresetSignal(t: Translate, id: string) {
  return t(`operations.calendar${CALENDAR_SUFFIX[id] ?? "DailyOpening"}Signal`);
}

const PACK_SUFFIX: Record<string, string> = {
  food_safety: "FoodSafety",
  labor_compliance: "Labor",
  training: "Training",
  cleaning: "Cleaning",
  equipment: "Equipment",
};

export function compliancePackLabel(t: Translate, key: string) {
  return t(`operations.complianceLabel${PACK_SUFFIX[key] ?? "FoodSafety"}`);
}

const HOOK_KEYS: Record<string, string> = {
  failed_step_task: "operations.hookFailedStep",
  inventory_review_issue: "operations.hookInventoryReview",
  overdue_critical_notification: "operations.hookOverdue",
};

export function workflowHookLabel(t: Translate, hookType: string) {
  return t(HOOK_KEYS[hookType] ?? "operations.hookFailedStep");
}

const REVIEW_PRIORITY_KEYS: Record<string, string> = {
  critical: "operations.reviewPriorityCritical",
  exception: "operations.reviewPriorityException",
  overdue: "operations.reviewPriorityOverdue",
  rejected: "operations.reviewPriorityRejected",
  needs_changes: "operations.reviewPriorityNeedsChanges",
  pending: "operations.reviewPriorityPending",
};

export function reviewPriorityLabel(t: Translate, priority: string) {
  return t(REVIEW_PRIORITY_KEYS[priority] ?? "operations.reviewPriorityPending");
}
