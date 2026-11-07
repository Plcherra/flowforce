import assert from "node:assert/strict";
import { withFormDistribution } from "@/features/forms/utils/formDistribution";
import { assembleMyShift } from "./myShiftView";
import { roleListsForShift, scheduledRoleIds } from "./scheduledRoleLists";

const NOW = new Date("2026-11-06T15:00:00.000Z");
const ROLES = [
  { id: "role-barista", name: "Barista" },
  { id: "role-lead", name: "Shift lead" },
];
const POSITIONS = [
  { id: "pos-bar", name: "Bar", roleId: "role-barista" },
];

function list(id: string, roleIds: string[], dueAt: string | null, status = "published") {
  return {
    id,
    title: id,
    status,
    settings: withFormDistribution(null, {
      recordKind: "list",
      roleIds,
      fillAudience: {
        kind: "company",
        userIds: [],
        positionIds: [],
        roleIds: [],
        departmentIds: [],
      },
      seeAudience: {
        kind: "company",
        userIds: [],
        positionIds: [],
        roleIds: [],
        departmentIds: [],
      },
      showFrom: null,
      dueAt,
    }),
  };
}

function shift(overrides: Record<string, unknown> = {}) {
  return {
    id: "shift-1",
    role: "Barista",
    title: "Morning",
    start_time: "2026-11-06T12:00:00.000Z",
    end_time: "2026-11-06T20:00:00.000Z",
    user_id: "ada",
    is_published: true,
    is_template: false,
    ...overrides,
  };
}

export function runScheduledRoleListTests() {
  assert.deepEqual(
    scheduledRoleIds({
      role: "Barista",
      roles: ROLES,
      positions: POSITIONS,
    }),
    ["role-barista"],
  );
  assert.deepEqual(
    scheduledRoleIds({
      role: "Line",
      positionId: "pos-bar",
      roles: ROLES,
      positions: POSITIONS,
    }),
    ["role-barista"],
  );

  const open = list("open", ["role-barista"], "2099-01-01T00:00:00.000Z");
  const late = list("late", ["role-barista"], "2020-01-01T00:00:00.000Z");
  const other = list("other", ["role-lead"], "2099-01-01T00:00:00.000Z");
  const draft = list("draft", ["role-barista"], "2099-01-01T00:00:00.000Z", "draft");
  assert.deepEqual(
    roleListsForShift([open, late, other, draft], ["role-barista"], NOW).map((form) => form.id),
    ["open"],
  );

  const published = assembleMyShift({
    viewerId: "ada",
    now: NOW,
    schedules: [shift()],
    forms: [open, late, other],
    fields: [{ id: "grind", form_id: "open", label: "Grind coffee", field_order: 1 }],
    submissions: [],
    tasks: [],
    roles: ROLES,
    positions: POSITIONS,
  });
  assert.equal(published.kind, "ready");
  if (published.kind !== "ready") return;
  assert.deepEqual(
    published.view.roleLists.map((item) => item.formId),
    ["open"],
  );
  assert.equal(published.view.roleLists[0]?.items[0]?.label, "Grind coffee");

  const unpublished = assembleMyShift({
    viewerId: "ada",
    now: NOW,
    schedules: [shift({ is_published: false })],
    forms: [open],
    fields: [],
    submissions: [],
    tasks: [],
    roles: ROLES,
    positions: POSITIONS,
  });
  assert.equal(unpublished.kind, "empty");

  const show = new Date(2026, 10, 7, 6, 30, 0);
  const before = new Date(2026, 10, 7, 5, 30, 0);
  const dueMoment = new Date(2026, 10, 7, 8, 30, 0);
  const after = new Date(2026, 10, 7, 9, 30, 0);
  const yesterday = new Date(2026, 10, 6, 6, 30, 0);
  const cashierRoles = [{ id: "role-cashier", name: "Cashier" }];
  const audience = {
    kind: "company" as const,
    userIds: [] as string[],
    positionIds: [] as string[],
    roleIds: [] as string[],
    departmentIds: [] as string[],
  };
  const cashierList = {
    id: "till",
    title: "Open till",
    status: "published",
    settings: withFormDistribution(null, {
      recordKind: "list",
      roleIds: ["role-cashier"],
      fillAudience: audience,
      seeAudience: audience,
      showFrom: null,
      dueAt: null,
      showAt: "06:00",
      dueTime: "08:00",
      completeBy: "09:00",
      timeMode: "shift_day",
    }),
  };
  const pedroShift = {
    id: "shift-pedro",
    role: "Cashier",
    title: "Front",
    start_time: new Date(2026, 10, 7, 7, 0, 0).toISOString(),
    end_time: new Date(2026, 10, 7, 13, 30, 0).toISOString(),
    user_id: "pedro",
    is_published: true,
    is_template: false,
    position_id: null,
  };
  const boardAt = (now: Date, role = "Cashier") =>
    assembleMyShift({
      viewerId: "pedro",
      now,
      schedules: [{ ...pedroShift, role }],
      forms: [cashierList],
      fields: [{ id: "count", form_id: "till", label: "Count the till", field_order: 1 }],
      submissions: [],
      tasks: [],
      roles: cashierRoles,
      positions: [],
    });
  assert.equal(boardAt(yesterday).kind, "empty");
  const tooSoon = boardAt(before);
  assert.equal(tooSoon.kind, "ready");
  if (tooSoon.kind === "ready") assert.equal(tooSoon.view.roleLists.length, 0);
  const visible = boardAt(show);
  assert.equal(visible.kind, "ready");
  if (visible.kind === "ready") {
    assert.deepEqual(visible.view.roleLists.map((item) => item.formId), ["till"]);
    assert.equal(visible.view.roleLists[0]?.phase, "open");
    assert.equal(visible.view.roleLists[0]?.items[0]?.label, "Count the till");
  }
  const dueBoard = boardAt(dueMoment);
  assert.equal(dueBoard.kind, "ready");
  if (dueBoard.kind === "ready") assert.equal(dueBoard.view.roleLists[0]?.phase, "due");
  const gone = boardAt(after);
  assert.equal(gone.kind, "ready");
  if (gone.kind === "ready") assert.equal(gone.view.roleLists.length, 0);
  const cook = boardAt(show, "Cook");
  assert.equal(cook.kind, "unmapped");

  const staying = {
    id: "stay",
    title: "Stay open",
    status: "published",
    settings: withFormDistribution(null, {
      recordKind: "list",
      roleIds: ["role-cashier"],
      fillAudience: audience,
      seeAudience: audience,
      showFrom: null,
      dueAt: null,
      showAt: null,
      dueTime: null,
      completeBy: null,
      timeMode: "shift_day",
    }),
  };
  const finished = assembleMyShift({
    viewerId: "pedro",
    now: show,
    schedules: [pedroShift],
    forms: [staying],
    fields: [{ id: "count", form_id: "stay", label: "Count the till", field_order: 1 }],
    submissions: [
      {
        form_id: "stay",
        submitted_at: new Date(2026, 10, 7, 6, 15, 0).toISOString(),
        submitted_by: "pedro",
        submission_data: { count: true },
      },
    ],
    tasks: [],
    roles: cashierRoles,
    positions: [],
  });
  assert.equal(finished.kind, "ready");
  if (finished.kind === "ready") assert.equal(finished.view.roleLists.length, 0);
}
