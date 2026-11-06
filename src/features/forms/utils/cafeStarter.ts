import { readChecklistAddress } from "@/features/forms/utils/checklistForms";
import {
  distributionProblem,
  readFormDistribution,
  withFormDistribution,
  type FormDistribution,
} from "@/features/forms/utils/formDistribution";
import type { TemplateField } from "@/features/forms/utils/formTemplates";
import { clampPermissionsToProductLevel } from "@/features/roles/constants/productLevels";
import { getProductRoleDefinition } from "@/features/roles/constants/productRoles";
import { emptyTaskAudience } from "@/features/tasks/utils/taskAudience";

export const CAFE_STARTER_PACK = "cafe";
export const CAFE_BARISTA_ROLE_NAME = "Barista";
export const CAFE_LIST_KEYS = ["opening", "closing"] as const;

export type CafeListKey = (typeof CAFE_LIST_KEYS)[number];

export type CafeListSpec = {
  key: CafeListKey;
  showFromTime: string;
  dueTime: string;
  itemCount: number;
};

export const CAFE_LIST_SPECS: readonly CafeListSpec[] = [
  { key: "opening", showFromTime: "05:30", dueTime: "09:00", itemCount: 5 },
  { key: "closing", showFromTime: "16:00", dueTime: "21:30", itemCount: 5 },
];

export type CafeRoleInsert = {
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  product_level: "staff";
  permissions: Record<string, boolean>;
};

export type CafeListWrite = {
  key: CafeListKey;
  title: string;
  description: string;
  showFrom: string | null;
  dueAt: string | null;
  itemLabels: string[];
};

export type CafeFormRef = {
  settings?: unknown;
  status?: string | null;
};

export function cafeCopyKey(
  list: CafeListKey,
  part: "Title" | "Description",
): string {
  return `forms.cafe.${list}${part}`;
}

export function cafeItemCopyKey(list: CafeListKey, index: number): string {
  return `forms.cafe.${list}Item${index + 1}`;
}

export function clockOnDay(day: Date, hhmm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return "";
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes,
    0,
    0,
  ).toISOString();
}

export function cafeDefaultWindow(
  day: Date,
  key: CafeListKey,
): { showFrom: string; dueAt: string } {
  const spec = CAFE_LIST_SPECS.find((item) => item.key === key);
  return {
    showFrom: clockOnDay(day, spec?.showFromTime ?? "00:00"),
    dueAt: clockOnDay(day, spec?.dueTime ?? "00:00"),
  };
}

export function findBaristaRole<
  T extends { id: string; name?: string | null; is_active?: boolean | null },
>(roles: readonly T[]): T | null {
  return (
    roles.find(
      (role) =>
        role.is_active !== false &&
        role.name?.trim().toLowerCase() === CAFE_BARISTA_ROLE_NAME.toLowerCase(),
    ) ?? null
  );
}

export function baristaRoleInsert(description: string): CafeRoleInsert {
  const staff = getProductRoleDefinition("staff");
  const permissions: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(staff.permissions)) {
    if (enabled === true) permissions[key] = true;
  }
  return {
    name: CAFE_BARISTA_ROLE_NAME,
    description,
    color: staff.color,
    icon: staff.icon,
    hierarchy_level: staff.hierarchy_level,
    product_level: "staff",
    permissions: clampPermissionsToProductLevel("staff", permissions),
  };
}

export function cafeListSettings(input: {
  key: CafeListKey;
  roleId: string;
  showFrom: string | null;
  dueAt: string | null;
}): Record<string, unknown> {
  const distribution: FormDistribution = {
    recordKind: "list",
    roleIds: input.roleId ? [input.roleId] : [],
    fillAudience: emptyTaskAudience("company"),
    seeAudience: emptyTaskAudience("company"),
    showFrom: input.showFrom,
    dueAt: input.dueAt,
  };
  const settings = withFormDistribution(null, distribution);
  settings.starter = { pack: CAFE_STARTER_PACK, list: input.key };
  return settings;
}

export function readCafeStarterList(settings: unknown): CafeListKey | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }
  const starter = (settings as Record<string, unknown>).starter;
  if (!starter || typeof starter !== "object" || Array.isArray(starter)) {
    return null;
  }
  const record = starter as Record<string, unknown>;
  if (record.pack !== CAFE_STARTER_PACK) return null;
  if (record.list === "opening" || record.list === "closing") return record.list;
  return null;
}

export function cafeListFields(labels: readonly string[]): TemplateField[] {
  return labels.map((label, index) => ({
    company_id: null,
    field_order: index + 1,
    field_type: "yes_no",
    label,
    placeholder: null,
    description: null,
    is_required: true,
    options: null,
    validation_rules: null,
    min_value: null,
    max_value: null,
    step_value: null,
    formula_expression: null,
    dependent_fields: null,
    rating_config: null,
    scan_config: null,
    media_config: null,
  }));
}

export function pendingCafeLists(forms: readonly CafeFormRef[]): CafeListKey[] {
  const present = new Set<CafeListKey>();
  for (const form of forms) {
    if (form.status === "archived") continue;
    const key = readCafeStarterList(form.settings);
    if (key) present.add(key);
  }
  return CAFE_LIST_KEYS.filter((key) => !present.has(key));
}

export function cafeStarterGate(input: {
  canCreateForms: boolean;
  canManageRoles: boolean;
  baristaExists: boolean;
}): "hidden" | "apply" | "blocked" {
  if (!input.canCreateForms) return "hidden";
  if (!input.baristaExists && !input.canManageRoles) return "blocked";
  return "apply";
}

export function cafeWindowProblem(
  showFrom: string | null,
  dueAt: string | null,
): "due" | null {
  const problem = distributionProblem(
    readFormDistribution(
      cafeListSettings({
        key: "opening",
        roleId: "pending",
        showFrom,
        dueAt,
      }),
    ),
  );
  return problem === "due" ? "due" : null;
}

export async function applyCafeStarter(input: {
  roles: readonly { id: string; name?: string | null; is_active?: boolean | null }[];
  forms: readonly CafeFormRef[];
  lists: readonly CafeListWrite[];
  roleDescription: string;
  canManageRoles: boolean;
  createRole: (role: CafeRoleInsert) => Promise<{ id: string }>;
  createList: (list: {
    key: CafeListKey;
    title: string;
    description: string;
    settings: Record<string, unknown>;
    fields: TemplateField[];
  }) => Promise<{ id: string }>;
}): Promise<
  | { already: true }
  | {
      already: false;
      roleId: string;
      createdRole: boolean;
      createdLists: CafeListKey[];
    }
> {
  const existing = findBaristaRole(input.roles);
  const pending = pendingCafeLists(input.forms);
  if (!existing && !input.canManageRoles) {
    throw new Error("blocked");
  }
  if (existing && pending.length === 0) return { already: true };

  const writes = pending.flatMap((key) => {
    const list = input.lists.find((item) => item.key === key);
    return list ? [list] : [];
  });
  for (const list of writes) {
    if (cafeWindowProblem(list.showFrom, list.dueAt)) {
      throw new Error("due");
    }
  }

  let roleId = existing?.id ?? "";
  let createdRole = false;
  if (!existing) {
    const created = await input.createRole(baristaRoleInsert(input.roleDescription));
    roleId = created.id;
    createdRole = true;
  }

  const createdLists: CafeListKey[] = [];
  for (const list of writes) {
    const settings = cafeListSettings({
      key: list.key,
      roleId,
      showFrom: list.showFrom,
      dueAt: list.dueAt,
    });
    if (readChecklistAddress(settings)) {
      throw new Error("slot");
    }
    await input.createList({
      key: list.key,
      title: list.title,
      description: list.description,
      settings,
      fields: cafeListFields(list.itemLabels),
    });
    createdLists.push(list.key);
  }

  return { already: false, roleId, createdRole, createdLists };
}
