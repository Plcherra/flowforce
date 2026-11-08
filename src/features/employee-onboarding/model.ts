import { normalizeProductRoleKey } from "@/features/roles/constants/productRoles";
import {
  MAX_ONBOARDING_BYTES,
  ONBOARDING_MIME_TYPES,
  type OnboardingMimeType,
} from "./constants";
import type { OnboardingStepKind, OnboardingStepView } from "./types";

const MIME_SET = new Set<string>(ONBOARDING_MIME_TYPES);

export function safeOnboardingFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "file").slice(0, 120);
}

export function companyDocumentPath(companyId: string, documentId: string, fileName: string) {
  return `${companyId}/${documentId}/${safeOnboardingFileName(fileName)}`;
}

export function employeeFilePath(
  companyId: string,
  profileId: string,
  progressId: string,
  fileName: string,
) {
  return `${companyId}/${profileId}/${progressId}/${safeOnboardingFileName(fileName)}`;
}

export function acceptedOnboardingFile(file: { type: string; size: number; name?: string }) {
  const extension = file.name?.split(".").pop()?.toLowerCase() ?? "";
  const office = new Set(["csv", "xls", "xlsx", "ppt", "pptx", "pdf", "png", "jpg", "jpeg", "webp", "gif"]);
  return (MIME_SET.has(file.type) || office.has(extension)) && file.size > 0 && file.size <= MAX_ONBOARDING_BYTES;
}

export function isOnboardingMime(value: string): value is OnboardingMimeType {
  return MIME_SET.has(value);
}

export function startDateIso(hireDate: string | null | undefined, startedAt: string) {
  const hire = hireDate?.trim();
  if (hire) return hire;
  return startedAt;
}

export function formatStartDate(value: string | null, language: string) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function visibleOnboardingSteps(steps: readonly OnboardingStepView[]) {
  return steps
    .filter((step) => !step.archivedAt)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

export function onboardingCompletion(steps: readonly OnboardingStepView[]) {
  const active = visibleOnboardingSteps(steps);
  const required = active.filter((step) => step.required);
  const requiredDone = required.filter((step) => step.done).length;
  return {
    activeDone: active.filter((step) => step.done).length,
    activeTotal: active.length,
    requiredDone,
    requiredTotal: required.length,
    canFinish: requiredDone === required.length,
  };
}

type PermissionProbe = (key: "systemSettings" | "documents.manage" | "onboarding.create") => boolean;

export function canManageOnboardingSteps(input: {
  role?: string | null;
  can: PermissionProbe;
}) {
  const level = normalizeProductRoleKey(input.role);
  if (level === "owner" || level === "admin") return true;
  return input.can("systemSettings");
}

export function canManageOnboardingDocuments(input: {
  role?: string | null;
  can: PermissionProbe;
}) {
  const level = normalizeProductRoleKey(input.role);
  if (level === "owner" || level === "admin" || level === "manager") return true;
  return (
    input.can("documents.manage") ||
    input.can("onboarding.create") ||
    input.can("systemSettings")
  );
}

export function nextStepSortOrder(steps: readonly { sortOrder: number }[]) {
  return steps.reduce((max, step) => Math.max(max, step.sortOrder), 0) + 1;
}

export function stepKindOrNull(value: string): OnboardingStepKind | null {
  if (value === "acknowledge" || value === "upload") return value;
  return null;
}
