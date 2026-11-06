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
}
