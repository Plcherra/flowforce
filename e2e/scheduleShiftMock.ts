import type { Page, Route } from "@playwright/test";
import { setHours, setMinutes } from "date-fns";
import { readFetchJson } from "./routeJson";

export const PUBLISHED_SHIFT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";
export const DRAFT_SHIFT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd02";
export const EDITOR_SHIFT_ID = PUBLISHED_SHIFT_ID;

export const SCHEDULE_WRITE_KEYS = [
  "schedule.create",
  "schedule.edit",
  "schedule.assign",
  "schedule.delete",
] as const;

export function weekShiftWindow(reference = new Date()) {
  const start = setMinutes(setHours(reference, 9), 0);
  const end = setMinutes(setHours(reference, 15), 0);
  return { start, end };
}

export function buildShiftRow(input: {
  id: string;
  companyId: string | null;
  start: Date;
  end: Date;
  isPublished: boolean;
  title: string;
  location?: string | null;
  notes?: string | null;
}) {
  const { id, companyId, start, end, isPublished, title, location = null, notes = null } = input;
  return {
    id,
    company_id: companyId,
    title,
    role: "Barista",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    location,
    required_headcount: 1,
    break_minutes: 0,
    color: "#3b82f6",
    timezone: "UTC",
    notes,
    created_at: start.toISOString(),
    created_by: null,
    updated_at: null,
    is_all_day: false,
    is_published: isPublished,
    is_template: false,
    position_id: null,
    template_id: null,
    status: isPublished ? "scheduled" : "draft",
    requirements: { role_name: "Barista" },
    hourly_rate: null,
    user_id: null,
  };
}

export async function fulfillDeskWeekShifts(route: Route) {
  const request = route.request();
  if (!request.url().includes("start_time")) {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = await readFetchJson(response);
  const rows = Array.isArray(json) ? json : [];
  const { start, end } = weekShiftWindow();
  const companyId =
    rows[0] && typeof rows[0] === "object"
      ? ((rows[0] as { company_id?: string }).company_id ?? null)
      : null;
  const extra = [
    buildShiftRow({
      id: PUBLISHED_SHIFT_ID,
      companyId,
      start,
      end,
      isPublished: true,
      title: "QA published shift",
    }),
    buildShiftRow({
      id: DRAFT_SHIFT_ID,
      companyId,
      start,
      end,
      isPublished: false,
      title: "QA draft shift",
    }),
  ];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify([...rows, ...extra]),
  });
}

export async function fulfillEditorWeekShift(route: Route, shiftId = EDITOR_SHIFT_ID) {
  const request = route.request();
  if (!request.url().includes("start_time")) {
    await route.continue();
    return;
  }
  const response = await route.fetch();
  const json = await readFetchJson(response);
  const rows = Array.isArray(json) ? json : [];
  const { start, end } = weekShiftWindow();
  const companyId =
    rows[0] && typeof rows[0] === "object"
      ? ((rows[0] as { company_id?: string }).company_id ?? null)
      : null;
  const extra = buildShiftRow({
    id: shiftId,
    companyId,
    start,
    end,
    isPublished: true,
    title: "QA editor shift",
    location: "Front counter",
    notes: "E2E shift editor",
  });
  const merged = [...rows.filter((row) => (row as { id?: string }).id !== shiftId), extra];
  await route.fulfill({
    status: response.status(),
    contentType: "application/json",
    body: JSON.stringify(merged),
  });
}

export async function installDeskWeekShiftMock(page: Page) {
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      await route.continue();
      return;
    }
    await fulfillDeskWeekShifts(route);
  });
}

export async function installEditorWeekShiftMock(
  page: Page,
  options?: { blockWrites?: boolean },
) {
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      if (options?.blockWrites) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
        return;
      }
      await route.continue();
      return;
    }
    await fulfillEditorWeekShift(route);
  });
}

export async function blockScheduleWrites(page: Page) {
  await page.route("**/rest/v1/schedules*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

export async function denyScheduleWritesExcept(page: Page, allow: string[]) {
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = await readFetchJson(response);
    const rows = Array.isArray(json) ? json : [];
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !SCHEDULE_WRITE_KEYS.includes(key as (typeof SCHEDULE_WRITE_KEYS)[number]);
    });
    const denied = SCHEDULE_WRITE_KEYS.filter((key) => !allow.includes(key)).map((key) => ({
      permission_key: key,
      permission_value: "deny",
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...denied, ...kept]),
    });
  });
}