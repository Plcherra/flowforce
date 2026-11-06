import {
  emptyTaskAudience,
  parseTaskAudience,
  taskAudienceJson,
  taskAudienceReady,
  type TaskAudience,
} from "@/features/tasks/utils/taskAudience";

export const FORM_RECORD_KINDS = ["form", "list"] as const;

export type FormRecordKind = (typeof FORM_RECORD_KINDS)[number];

export type FormDistribution = {
  recordKind: FormRecordKind;
  roleIds: string[];
  fillAudience: TaskAudience;
  seeAudience: TaskAudience;
  showFrom: string | null;
  dueAt: string | null;
};

export type FormAccessViewer = {
  userId: string | null;
  roleId: string | null;
  roleName: string | null;
  positionIds: string[];
  departmentId: string | null;
  canManage: boolean;
  canSubmit: boolean;
  canReadSubmissions: boolean;
  roles?: ReadonlyArray<{ id: string; name: string }>;
};

export type FormAccessRow = {
  status?: string | null;
  created_by?: string | null;
  settings?: unknown;
};

const DISTRIBUTION_KEY = "distribution";

export function defaultFormDistribution(): FormDistribution {
  return {
    recordKind: "form",
    roleIds: [],
    fillAudience: emptyTaskAudience("company"),
    seeAudience: emptyTaskAudience("company"),
    showFrom: null,
    dueAt: null,
  };
}

function settingsRecord(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }
  return { ...(settings as Record<string, unknown>) };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function readIso(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readAudience(raw: unknown): TaskAudience {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyTaskAudience("company");
  }
  const parsed = parseTaskAudience(raw);
  if (parsed.kind === "private") return emptyTaskAudience("company");
  return parsed;
}

export function readFormDistribution(settings: unknown): FormDistribution {
  const raw = settingsRecord(settings)[DISTRIBUTION_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultFormDistribution();
  }
  const record = raw as Record<string, unknown>;
  const recordKind = record.record_kind === "list" || record.recordKind === "list" ? "list" : "form";
  return {
    recordKind,
    roleIds: stringList(record.role_ids ?? record.roleIds),
    fillAudience: readAudience(record.fill_audience ?? record.fillAudience),
    seeAudience: readAudience(record.see_audience ?? record.seeAudience),
    showFrom: readIso(record.show_from ?? record.showFrom),
    dueAt: readIso(record.due_at ?? record.dueAt),
  };
}

export function withFormDistribution(
  settings: unknown,
  distribution: FormDistribution,
): Record<string, unknown> {
  const base = settingsRecord(settings);
  base[DISTRIBUTION_KEY] = {
    record_kind: distribution.recordKind,
    role_ids: distribution.roleIds,
    fill_audience: taskAudienceJson(distribution.fillAudience),
    see_audience: taskAudienceJson(distribution.seeAudience),
    show_from: distribution.showFrom,
    due_at: distribution.dueAt,
  };
  return base;
}

export function distributionProblem(
  distribution: FormDistribution,
): "due" | "fill" | "see" | null {
  if (!taskAudienceReady(distribution.fillAudience)) return "fill";
  if (!taskAudienceReady(distribution.seeAudience)) return "see";
  if (distribution.showFrom && distribution.dueAt) {
    const start = new Date(distribution.showFrom).getTime();
    const due = new Date(distribution.dueAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(due) && due <= start) return "due";
  }
  return null;
}

function roleName(roleId: string, viewer: FormAccessViewer): string | null {
  const role = viewer.roles?.find((item) => item.id === roleId);
  const name = role?.name.trim().toLowerCase();
  return name ? name : null;
}

function viewerMatchesRole(roleId: string, viewer: FormAccessViewer): boolean {
  if (viewer.roleId && viewer.roleId === roleId) return true;
  const viewerName = viewer.roleName?.trim().toLowerCase();
  if (!viewerName) return false;
  return roleName(roleId, viewer) === viewerName;
}

export function audienceIncludes(audience: TaskAudience, viewer: FormAccessViewer): boolean {
  if (audience.kind === "company") return true;
  if (audience.kind === "private") return false;
  if (!viewer.userId) return false;
  if (audience.kind === "people") return audience.userIds.includes(viewer.userId);
  if (audience.kind === "position") {
    return audience.positionIds.some((id) => viewer.positionIds.includes(id));
  }
  if (audience.kind === "role") {
    return audience.roleIds.some((id) => viewerMatchesRole(id, viewer));
  }
  if (audience.kind === "department") {
    return viewer.departmentId != null && audience.departmentIds.includes(viewer.departmentId);
  }
  return false;
}

export function formIsOpenForFill(
  distribution: FormDistribution,
  now: Date,
): boolean {
  if (distribution.showFrom) {
    const start = new Date(distribution.showFrom);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (distribution.dueAt) {
    const due = new Date(distribution.dueAt);
    if (!Number.isNaN(due.getTime()) && now >= due) return false;
  }
  return true;
}

function roleAttached(distribution: FormDistribution, viewer: FormAccessViewer): boolean {
  if (distribution.roleIds.length === 0) return true;
  return distribution.roleIds.some((id) => viewerMatchesRole(id, viewer));
}

export function canFillForm(
  form: FormAccessRow,
  viewer: FormAccessViewer,
  now: Date = new Date(),
): boolean {
  if (!viewer.canSubmit || !viewer.userId) return false;
  if (form.status !== "published") return false;
  const distribution = readFormDistribution(form.settings);
  if (!formIsOpenForFill(distribution, now)) return false;
  if (form.created_by === viewer.userId) return true;
  return audienceIncludes(distribution.fillAudience, viewer) && roleAttached(distribution, viewer);
}

export function canSeeFormSubmissions(
  form: FormAccessRow,
  viewer: FormAccessViewer,
  options?: { hideOthers?: boolean },
): boolean {
  if (!viewer.userId) return false;
  if (form.created_by === viewer.userId) return true;
  if (options?.hideOthers) return false;
  if (viewer.canManage) return true;
  const distribution = readFormDistribution(form.settings);
  if (!audienceIncludes(distribution.seeAudience, viewer)) return false;
  if (distribution.seeAudience.kind === "company") return viewer.canReadSubmissions;
  return true;
}

export function formListedForViewer(
  form: FormAccessRow,
  viewer: FormAccessViewer,
  now: Date = new Date(),
  options?: { hideOthers?: boolean },
): boolean {
  if (!viewer.userId) return false;
  if (form.created_by === viewer.userId) return true;
  if (viewer.canManage && !options?.hideOthers) return true;
  if (form.status === "draft") return false;
  if (canFillForm(form, viewer, now)) return true;
  if (form.status === "archived") {
    return canSeeFormSubmissions(form, viewer, options);
  }
  if (options?.hideOthers) return false;
  return canSeeFormSubmissions(form, viewer);
}
