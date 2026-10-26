import type { TFunction } from "i18next";
import type { TaskKind } from "./taskKind";

const STATUS_LABEL_KEYS: Record<string, string> = {
  all: "tasks.statusAll",
  todo: "tasks.statusTodo",
  in_progress: "tasks.statusInProgress",
  review: "tasks.statusReview",
  blocked: "tasks.statusBlocked",
  done: "tasks.statusDone",
  completed: "tasks.statusDone",
  cancelled: "tasks.statusCancelled",
  other: "tasks.statusOther",
};

const STATUS_HINT_KEYS: Record<string, string> = {
  all: "tasks.statusHintAll",
  todo: "tasks.statusHintTodo",
  in_progress: "tasks.statusHintInProgress",
  review: "tasks.statusHintReview",
  blocked: "tasks.statusHintBlocked",
  done: "tasks.statusHintDone",
  completed: "tasks.statusHintDone",
  cancelled: "tasks.statusHintCancelled",
  other: "tasks.statusHintOther",
};

const KIND_KEYS: Record<TaskKind, string> = {
  shift: "tasks.kindShift",
  checklist: "tasks.kindChecklist",
  custom: "tasks.kindCustom",
};

const PRIORITY_KEYS: Record<string, string> = {
  all: "tasks.allPriorities",
  low: "tasks.low",
  medium: "tasks.medium",
  high: "tasks.high",
  urgent: "tasks.urgent",
  other: "tasks.statusOther",
};

const WARNING_KEYS: Record<string, string> = {
  overdue: "tasks.warningOverdue",
  blocked: "tasks.warningBlocked",
  unassigned: "tasks.warningUnassigned",
  missing_reminder: "tasks.warningMissingReminder",
};

const READINESS_HINT_KEYS = {
  overdue: "tasks.readinessHintOverdue",
  unassigned: "tasks.readinessHintUnassigned",
  due: "tasks.readinessHintDue",
} as const;

export function translatedStatusLabel(
  t: TFunction,
  value: string,
  fallback?: string,
): string {
  const key = STATUS_LABEL_KEYS[value];
  return key ? t(key) : (fallback ?? value);
}

export function translatedStatusHint(t: TFunction, value: string): string {
  const key = STATUS_HINT_KEYS[value] ?? STATUS_HINT_KEYS.other;
  return t(key);
}

export function translatedKindLabel(t: TFunction, kind: TaskKind): string {
  return t(KIND_KEYS[kind]);
}

export function translatedPriorityLabel(
  t: TFunction,
  value: string,
  fallback: string,
): string {
  const key = PRIORITY_KEYS[value];
  return key ? t(key) : fallback;
}

export function translatedWarningLabel(t: TFunction, reason: string): string {
  const key = WARNING_KEYS[reason];
  return key ? t(key) : reason;
}

export function translatedReadinessHint(
  t: TFunction,
  key: keyof typeof READINESS_HINT_KEYS,
): string {
  return t(READINESS_HINT_KEYS[key]);
}

export function workflowActionLabel(
  t: TFunction,
  current: string,
  target: string,
): string {
  if (current === "todo" && target === "in_progress") return t("tasks.startTask");
  if (current === "in_progress" && target === "review") return t("tasks.sendToReview");
  if (current === "in_progress" && target === "blocked") return t("tasks.markBlocked");
  if (current === "blocked" && target === "in_progress") return t("tasks.unblockTask");
  if (target === "cancelled") return t("tasks.cancelTask");
  if (target === "done" || target === "completed") return t("tasks.markDone");
  if (target === "todo") {
    if (current === "cancelled" || current === "completed" || current === "done") {
      return t("tasks.reopenTask");
    }
    if (current === "review") return t("tasks.sendBackToTodo");
    return t("tasks.moveToTodo");
  }
  return t("tasks.moveToStatus", { status: translatedStatusLabel(t, target) });
}
