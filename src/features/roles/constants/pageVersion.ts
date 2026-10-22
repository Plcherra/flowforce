export type SchedulePageVersion = {
  team: boolean;
  draft: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type ActionPageVersion = {
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type PageArea =
  | "schedule"
  | "inventory"
  | "recognition"
  | "teamLeadership"
  | "onboarding"
  | "certifications";

type PermissionMap = Record<string, boolean> | null | undefined;

function allowed(permissions: PermissionMap, key: string): boolean {
  return Boolean(permissions?.[key]);
}

export function schedulePageVersion(
  permissions: PermissionMap,
  hierarchyLevel?: number | null,
): SchedulePageVersion {
  void hierarchyLevel;
  const create = allowed(permissions, "schedule.create");
  const edit = allowed(permissions, "schedule.edit");
  const remove = allowed(permissions, "schedule.delete");
  return {
    team:
      allowed(permissions, "viewTeamSchedules") &&
      allowed(permissions, "schedule.view"),
    draft: allowed(permissions, "editSchedules") && !create && !edit && !remove,
    create,
    edit,
    delete: remove,
  };
}

export function inventoryPageVersion(
  permissions: PermissionMap,
  hierarchyLevel?: number | null,
): ActionPageVersion {
  void hierarchyLevel;
  return {
    read: allowed(permissions, "inventory.view"),
    create: allowed(permissions, "inventory.create"),
    edit: allowed(permissions, "inventory.edit"),
    delete: allowed(permissions, "inventory.delete"),
  };
}

export function recognitionPageVersion(
  permissions: PermissionMap,
  hierarchyLevel?: number | null,
): ActionPageVersion {
  void hierarchyLevel;
  return {
    read: false,
    create: false,
    edit: allowed(permissions, "recognition.edit"),
    delete: false,
  };
}

export function teamLeadershipPageVersion(
  permissions: PermissionMap,
  hierarchyLevel?: number | null,
): ActionPageVersion {
  void hierarchyLevel;
  return {
    read: allowed(permissions, "directory.view"),
    create: allowed(permissions, "manageUsers"),
    edit: allowed(permissions, "directory.manage"),
    delete: false,
  };
}

export function onboardingPageVersion(
  permissions: PermissionMap,
  hierarchyLevel?: number | null,
): ActionPageVersion {
  void hierarchyLevel;
  return {
    read: false,
    create: allowed(permissions, "onboarding.create"),
    edit: allowed(permissions, "managePositions"),
    delete: allowed(permissions, "onboarding.delete"),
  };
}

export function certificationsPageVersion(
  permissions: PermissionMap,
  hierarchyLevel?: number | null,
): ActionPageVersion {
  void permissions;
  void hierarchyLevel;
  return { read: false, create: false, edit: false, delete: false };
}

export function pageVersion(
  area: PageArea,
  permissions: PermissionMap,
  hierarchyLevel?: number | null,
): SchedulePageVersion | ActionPageVersion {
  switch (area) {
    case "schedule":
      return schedulePageVersion(permissions, hierarchyLevel);
    case "inventory":
      return inventoryPageVersion(permissions, hierarchyLevel);
    case "recognition":
      return recognitionPageVersion(permissions, hierarchyLevel);
    case "teamLeadership":
      return teamLeadershipPageVersion(permissions, hierarchyLevel);
    case "onboarding":
      return onboardingPageVersion(permissions, hierarchyLevel);
    case "certifications":
      return certificationsPageVersion(permissions, hierarchyLevel);
  }
}
