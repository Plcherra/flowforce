type DateArg = string | Date | null | undefined;

const normalizeDateArg = (value: DateArg) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const normalizeId = (value?: string | null) => value ?? null;

export const queryKeys = {
  inventoryItems: (companyId?: string | null) =>
    ["inventory", normalizeId(companyId), "items"] as const,
  inventoryLocations: (companyId?: string | null) =>
    ["inventory", normalizeId(companyId), "locations"] as const,
  inventoryCounts: (companyId?: string | null, status?: string | null) =>
    ["inventory", normalizeId(companyId), "counts", normalizeId(status)] as const,
  inventoryPurchasing: (companyId?: string | null, status?: string | null) =>
    [
      "inventory",
      normalizeId(companyId),
      "purchasing",
      normalizeId(status),
    ] as const,
  employeesDirectory: (companyId?: string | null) =>
    ["employees", normalizeId(companyId), "directory"] as const,
  employeesInvites: (companyId?: string | null) =>
    ["employees", normalizeId(companyId), "invites"] as const,
  tasksList: (companyId?: string | null, filters?: Record<string, unknown>) =>
    ["tasks", normalizeId(companyId), "list", filters ?? null] as const,
  taskTimeline: (companyId?: string | null, taskId?: string | null) =>
    ["tasks", normalizeId(companyId), "timeline", normalizeId(taskId)] as const,
  analyticsKpis: (companyId?: string | null, range?: string | null) =>
    ["analytics", normalizeId(companyId), "kpis", normalizeId(range)] as const,
  analyticsReports: (companyId?: string | null, range?: string | null) =>
    ["analytics", normalizeId(companyId), "reports", normalizeId(range)] as const,
  shifts: (companyId?: string | null, start?: DateArg, end?: DateArg) =>
    [
      "shifts",
      normalizeId(companyId),
      normalizeDateArg(start),
      normalizeDateArg(end),
    ] as const,
  assignments: (companyId?: string | null, start?: DateArg, end?: DateArg) =>
    [
      "assignments",
      normalizeId(companyId),
      normalizeDateArg(start),
      normalizeDateArg(end),
    ] as const,
  timeOff: (companyId?: string | null, start?: DateArg, end?: DateArg) =>
    [
      "time-off",
      normalizeId(companyId),
      normalizeDateArg(start),
      normalizeDateArg(end),
    ] as const,
  unavailability: (companyId?: string | null, start?: DateArg, end?: DateArg) =>
    [
      "unavailability",
      normalizeId(companyId),
      normalizeDateArg(start),
      normalizeDateArg(end),
    ] as const,
  vendorEvents: (companyId?: string | null, start?: DateArg, end?: DateArg) =>
    [
      "vendor-events",
      normalizeId(companyId),
      normalizeDateArg(start),
      normalizeDateArg(end),
    ] as const,
  orgPrefs: (companyId?: string | null) =>
    ["org-prefs", normalizeId(companyId)] as const,
  calendarEventsCompany: (companyId?: string | null) =>
    ["calendar-events", normalizeId(companyId)] as const,
  calendarEventsList: (companyId?: string | null) =>
    ["calendar-events", normalizeId(companyId), "list"] as const,
  calendarEventsRange: (
    companyId?: string | null,
    start?: DateArg,
    end?: DateArg,
    storeId?: string | null,
  ) =>
    [
      "calendar-events",
      normalizeId(companyId),
      "range",
      normalizeDateArg(start),
      normalizeDateArg(end),
      normalizeId(storeId),
    ] as const,
  calendarEventsDisabled: ["calendar-events", "disabled"] as const,
};

export type QueryKey = ReturnType<
  Extract<(typeof queryKeys)[keyof typeof queryKeys], (...args: any[]) => any>
>;
