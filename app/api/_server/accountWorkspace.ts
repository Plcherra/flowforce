import { createServerLogger } from "./utils/logger";
import {
  clockOnNextDay,
  enabledJobRoles,
  onboardingRecordsFromWorkspace,
  starterListSettings,
  workingHoursFor,
  type AccountWorkspaceInput,
} from "@/features/onboarding/account/accountSetupModel";

const logger = createServerLogger("account-workspace");

type DbError = { message?: string } | null;

type WorkspaceClient = {
  from: (table: string) => any;
};

export type WorkspaceRoleRef = {
  key: string;
  id: string;
  name: string;
  departmentId: string | null;
  level: "staff" | "manager";
};

export type WorkspaceApplyResult = {
  locationId: string | null;
  roles: WorkspaceRoleRef[];
  warnings: string[];
};

function rowsOf(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function addHours(clock: string, hours: number): string {
  const [hour, minute] = clock.split(":").map(Number);
  const total = Math.min(Math.max(hour * 60 + minute + hours * 60, 0), 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function applyAccountWorkspace(
  client: WorkspaceClient,
  input: {
    companyId: string;
    userId: string;
    workspace: AccountWorkspaceInput;
  },
): Promise<WorkspaceApplyResult> {
  const warnings: string[] = [];
  const jobs = enabledJobRoles(input.workspace);
  const hours = workingHoursFor(input.workspace.store.opens, input.workspace.store.closes);
  const activeDepartments = input.workspace.org.departments.filter(
    (department) =>
      department.name.trim().length > 0 &&
      department.roles.some((role) => role.name.trim().length > 0),
  );

  let departmentIds = new Map<string, string>();
  const departmentInsert = await client
    .from("departments")
    .insert(
      activeDepartments.map((department) => ({
        company_id: input.companyId,
        name: department.name.trim(),
        type: department.id,
      })),
    )
    .select("id, name, type");
  if (departmentInsert.error) {
    warnings.push("departments");
    logger.warn("Unable to store onboarding departments", {
      error: departmentInsert.error,
      context: { companyId: input.companyId },
    });
  } else {
    departmentIds = new Map(
      rowsOf(departmentInsert.data).map((row) => [text(row.type) || text(row.name), text(row.id)]),
    );
  }

  const roleResult = await client
    .from("company_roles")
    .select("id, name")
    .eq("company_id", input.companyId);
  if (roleResult.error) {
    warnings.push("roles");
    logger.warn("Unable to read onboarding roles", {
      error: roleResult.error,
      context: { companyId: input.companyId },
    });
  }
  const rolesByName = new Map(
    rowsOf(roleResult.data).map((row) => [text(row.name).toLowerCase(), text(row.id)]),
  );

  const roles: WorkspaceRoleRef[] = [];
  for (const job of jobs) {
    const roleId = rolesByName.get(job.name.toLowerCase()) ?? "";
    const departmentId = departmentIds.get(job.departmentKey) ?? null;
    if (!roleId) {
      warnings.push(`role:${job.key}`);
      continue;
    }
    const permissions = onboardingRecordsFromWorkspace(input.workspace).positions.find(
      (position) => position.name === job.name,
    )?.permissions;
    const update = await client
      .from("positions")
      .update({
        role_id: roleId,
        department_id: departmentId,
        permissions: permissions ?? {},
      })
      .eq("company_id", input.companyId)
      .eq("name", job.name);
    if (update.error) {
      warnings.push(`position:${job.key}`);
      logger.warn("Unable to link onboarding position", {
        error: update.error,
        context: { companyId: input.companyId, role: job.name },
      });
    }
    roles.push({
      key: job.key,
      id: roleId,
      name: job.name,
      departmentId,
      level: job.level,
    });
  }

  let locationId: string | null = null;
  const locationInsert = await client
    .from("inv_locations")
    .insert({
      company_id: input.companyId,
      name: input.workspace.store.name.trim(),
      location_type: "store",
      is_active: true,
    })
    .select("id")
    .maybeSingle();
  if (locationInsert.error) {
    warnings.push("location");
    logger.warn("Unable to store the first store", {
      error: locationInsert.error,
      context: { companyId: input.companyId },
    });
  } else {
    const row = locationInsert.data as { id?: string } | null;
    locationId = row?.id ?? null;
  }

  const companyUpdate = await client
    .from("companies")
    .update({
      timezone: input.workspace.timezone,
      working_hours: hours,
    })
    .eq("id", input.companyId);
  if (companyUpdate.error) {
    warnings.push("hours");
    logger.warn("Unable to store store hours", {
      error: companyUpdate.error,
      context: { companyId: input.companyId },
    });
  }

  const settingsResult = await client
    .from("system_settings")
    .select("localization, admin_config")
    .eq("company_id", input.companyId)
    .maybeSingle();
  if (!settingsResult.error && settingsResult.data) {
    const current = settingsResult.data as {
      localization?: unknown;
      admin_config?: unknown;
    };
    const localization =
      current.localization && typeof current.localization === "object"
        ? { ...(current.localization as Record<string, unknown>) }
        : {};
    localization.timezone = input.workspace.timezone;
    localization.language = input.workspace.locale;
    const admin =
      current.admin_config && typeof current.admin_config === "object"
        ? { ...(current.admin_config as Record<string, unknown>) }
        : {};
    admin.businessStructure = {
      workingHours: hours,
      departments: activeDepartments.map((department) => ({
        id: departmentIds.get(department.id) ?? department.id,
        name: department.name,
        type: department.id,
      })),
      locations: locationId
        ? [
            {
              id: locationId,
              name: input.workspace.store.name.trim(),
              location_type: "store",
              is_active: true,
            },
          ]
        : [],
    };
    const settingsUpdate = await client
      .from("system_settings")
      .update({
        localization,
        admin_config: admin,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", input.companyId);
    if (settingsUpdate.error) warnings.push("settings");
  } else if (settingsResult.error) {
    warnings.push("settings");
  }

  const firstRole = roles[0];
  if (input.workspace.starter === "shift" && firstRole) {
    const range = clockOnNextDay(
      input.workspace.store.opens,
      input.workspace.store.closes,
    );
    const shiftInsert = await client.from("schedules").insert({
      company_id: input.companyId,
      created_by: input.userId,
      title: input.workspace.starterCopy.shiftTitle,
      role: firstRole.name,
      start_time: range.start,
      end_time: range.end,
      is_published: false,
      is_template: false,
      status: "draft",
      timezone: input.workspace.timezone,
      location: input.workspace.store.name.trim(),
      requirements: { accountSetup: true },
    });
    if (shiftInsert.error) warnings.push("shift");
  }

  if (input.workspace.starter === "lists" && firstRole) {
    const openingDue = addHours(input.workspace.store.opens, 2);
    const closingStart = addHours(input.workspace.store.closes, -2);
    const opening = clockOnNextDay(input.workspace.store.opens, openingDue);
    const closing = clockOnNextDay(closingStart, input.workspace.store.closes);
    const lists = input.workspace.starterCopy.lists.map((list, index) => {
      const window = index === 0 ? opening : closing;
      return {
        key: list.key,
        title: list.title,
        items: list.items,
        showFrom: window.start,
        dueAt: window.end,
      };
    });
    for (const list of lists) {
      const settings = starterListSettings(firstRole.id, list.showFrom, list.dueAt);
      settings.starter = { pack: "account-setup", list: list.key };
      const formInsert = await client
        .from("forms")
        .insert({
          company_id: input.companyId,
          created_by: input.userId,
          title: list.title,
          status: "published",
          settings,
        })
        .select("id")
        .maybeSingle();
      if (formInsert.error || !formInsert.data?.id) {
        warnings.push(`list:${list.key}`);
        continue;
      }
      const fieldInsert = await client.from("form_fields").insert(
        list.items.filter((label) => label.trim()).map((label, index) => ({
          company_id: input.companyId,
          form_id: formInsert.data.id,
          field_order: index + 1,
          field_type: "yes_no",
          label: label.trim(),
          is_required: true,
        })),
      );
      if (fieldInsert.error) warnings.push(`fields:${list.key}`);
    }
  }

  return { locationId, roles, warnings };
}

export function workspaceWarning(error: DbError): string {
  return error?.message ?? "workspace";
}
