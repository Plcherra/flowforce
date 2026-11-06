import assert from "node:assert/strict";
import { readChecklistAddress } from "@/features/forms/utils/checklistForms";
import { readFormDistribution } from "@/features/forms/utils/formDistribution";
import { assembleMyShift } from "@/features/tasks/utils/myShiftView";
import {
  applyCafeStarter,
  baristaRoleInsert,
  cafeDefaultWindow,
  cafeListFields,
  cafeListSettings,
  cafeStarterGate,
  cafeWindowProblem,
  CAFE_BARISTA_ROLE_NAME,
  CAFE_LIST_SPECS,
  clockOnDay,
  findBaristaRole,
  pendingCafeLists,
  readCafeStarterList,
} from "./cafeStarter";

const DAY = new Date(2026, 10, 6, 12, 0, 0);

export function runCafeStarterTests() {
  const opening = cafeDefaultWindow(DAY, "opening");
  const closing = cafeDefaultWindow(DAY, "closing");
  assert.equal(opening.showFrom, clockOnDay(DAY, "05:30"));
  assert.equal(opening.dueAt, clockOnDay(DAY, "09:00"));
  assert.equal(closing.showFrom, clockOnDay(DAY, "16:00"));
  assert.equal(closing.dueAt, clockOnDay(DAY, "21:30"));
  assert.notEqual(opening.showFrom, closing.showFrom);
  assert.equal(cafeWindowProblem(opening.showFrom, opening.dueAt), null);
  assert.equal(cafeWindowProblem(opening.dueAt, opening.showFrom), "due");

  const role = baristaRoleInsert("Makes drinks");
  assert.equal(role.name, CAFE_BARISTA_ROLE_NAME);
  assert.equal(role.product_level, "staff");
  assert.equal(role.permissions["forms.submit"], true);
  assert.equal(role.permissions.createForms, undefined);
  assert.equal(findBaristaRole([{ id: "r1", name: " barista " }])?.id, "r1");
  assert.equal(
    findBaristaRole([{ id: "r2", name: "Barista", is_active: false }]),
    null,
  );

  const settings = cafeListSettings({
    key: "opening",
    roleId: "role-barista",
    showFrom: opening.showFrom,
    dueAt: opening.dueAt,
  });
  assert.equal(readChecklistAddress(settings), null);
  assert.equal("checklist" in settings, false);
  assert.equal("automation" in settings, false);
  assert.deepEqual(Object.keys(settings).sort(), ["distribution", "starter"]);
  const distribution = readFormDistribution(settings);
  assert.equal(distribution.recordKind, "list");
  assert.deepEqual(distribution.roleIds, ["role-barista"]);
  assert.equal(distribution.showFrom, opening.showFrom);
  assert.equal(distribution.dueAt, opening.dueAt);
  assert.equal(readCafeStarterList(settings), "opening");
  const fields = cafeListFields(["Turn on the espresso machine", "Count the till"]);
  assert.equal(fields.length, 2);
  assert.equal(fields[0]?.field_type, "yes_no");
  assert.equal(CAFE_LIST_SPECS[0]?.itemCount, 5);
  assert.equal(CAFE_LIST_SPECS[1]?.itemCount, 5);

  assert.equal(cafeStarterGate({ canCreateForms: false, canManageRoles: true, baristaExists: false }), "hidden");
  assert.equal(cafeStarterGate({ canCreateForms: true, canManageRoles: false, baristaExists: false }), "blocked");
  assert.equal(cafeStarterGate({ canCreateForms: true, canManageRoles: false, baristaExists: true }), "apply");
  assert.equal(cafeStarterGate({ canCreateForms: true, canManageRoles: true, baristaExists: false }), "apply");

  const morning = new Date(2026, 10, 6, 8, 0, 0);
  const evening = new Date(2026, 10, 6, 18, 0, 0);
  const openSettings = cafeListSettings({
    key: "opening",
    roleId: "role-barista",
    showFrom: clockOnDay(morning, "05:30"),
    dueAt: clockOnDay(morning, "09:00"),
  });
  const closeSettings = cafeListSettings({
    key: "closing",
    roleId: "role-barista",
    showFrom: clockOnDay(morning, "16:00"),
    dueAt: clockOnDay(morning, "21:30"),
  });
  const forms = [
    { id: "open-id", title: "Opening list", settings: openSettings, status: "published" },
    { id: "close-id", title: "Closing list", settings: closeSettings, status: "published" },
  ];
  const labels = ["Turn on the espresso machine", "Count the till"];
  const shift = (published: boolean, roleName: string, at: Date) => ({
    id: "shift-1",
    role: roleName,
    title: "Bar",
    start_time: new Date(at.getTime() - 60 * 60 * 1000).toISOString(),
    end_time: new Date(at.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    user_id: "ada",
    is_published: published,
    is_template: false,
    position_id: null,
  });
  const board = (at: Date, published = true, roleName = "Barista") =>
    assembleMyShift({
      viewerId: "ada",
      now: at,
      schedules: [shift(published, roleName, at)],
      forms,
      fields: labels.map((label, index) => ({
        id: `field-${index}`,
        form_id: "open-id",
        label,
        field_order: index + 1,
      })),
      submissions: [],
      tasks: [],
      roles: [{ id: "role-barista", name: "Barista" }],
      positions: [],
    });

  const morningBoard = board(morning);
  assert.equal(morningBoard.kind, "ready");
  if (morningBoard.kind === "ready") {
    assert.deepEqual(
      morningBoard.view.roleLists.map((list) => list.title),
      ["Opening list"],
    );
    assert.deepEqual(
      morningBoard.view.roleLists[0]?.items.map((item) => item.label),
      labels,
    );
  }
  const eveningBoard = board(evening);
  assert.equal(eveningBoard.kind, "ready");
  if (eveningBoard.kind === "ready") {
    assert.deepEqual(
      eveningBoard.view.roleLists.map((list) => list.formId),
      ["close-id"],
    );
  }
  assert.equal(board(morning, false).kind, "empty");
  const other = board(morning, true, "Dish");
  assert.equal(other.kind, "unmapped");

  assert.deepEqual(
    pendingCafeLists([{ settings: openSettings, status: "published" }]),
    ["closing"],
  );
  assert.deepEqual(
    pendingCafeLists([{ settings: openSettings, status: "archived" }]),
    ["opening", "closing"],
  );
}

export async function runCafeStarterApplyTests() {
  const createdRoles: string[] = [];
  const createdLists: string[] = [];
  const first = await applyCafeStarter({
    roles: [],
    forms: [],
    roleDescription: "Makes drinks",
    canManageRoles: true,
    lists: [
      {
        key: "opening",
        title: "Opening list",
        description: "Set up the bar",
        showFrom: clockOnDay(DAY, "05:30"),
        dueAt: clockOnDay(DAY, "09:00"),
        itemLabels: ["Turn on the espresso machine"],
      },
      {
        key: "closing",
        title: "Closing list",
        description: "Close the bar",
        showFrom: clockOnDay(DAY, "16:00"),
        dueAt: clockOnDay(DAY, "21:30"),
        itemLabels: ["Lock up"],
      },
    ],
    createRole: async (role) => {
      createdRoles.push(role.name);
      assert.equal(role.permissions["forms.submit"], true);
      return { id: "role-barista" };
    },
    createList: async (list) => {
      createdLists.push(list.key);
      assert.equal(readChecklistAddress(list.settings), null);
      assert.deepEqual(readFormDistribution(list.settings).roleIds, ["role-barista"]);
      assert.equal(list.fields.length > 0, true);
      return { id: list.key };
    },
  });
  assert.equal(first.already, false);
  if (!first.already) {
    assert.equal(first.createdRole, true);
    assert.deepEqual(first.createdLists, ["opening", "closing"]);
  }
  assert.deepEqual(createdRoles, ["Barista"]);
  assert.deepEqual(createdLists, ["opening", "closing"]);

  const again = await applyCafeStarter({
    roles: [{ id: "role-barista", name: "Barista" }],
    forms: [
      {
        status: "published",
        settings: cafeListSettings({
          key: "opening",
          roleId: "role-barista",
          showFrom: null,
          dueAt: null,
        }),
      },
      {
        status: "published",
        settings: cafeListSettings({
          key: "closing",
          roleId: "role-barista",
          showFrom: null,
          dueAt: null,
        }),
      },
    ],
    lists: [],
    roleDescription: "Makes drinks",
    canManageRoles: true,
    createRole: async () => {
      throw new Error("role");
    },
    createList: async () => {
      throw new Error("list");
    },
  });
  assert.deepEqual(again, { already: true });

  await assert.rejects(
    () =>
      applyCafeStarter({
        roles: [],
        forms: [],
        lists: [],
        roleDescription: "Makes drinks",
        canManageRoles: false,
        createRole: async () => ({ id: "nope" }),
        createList: async () => ({ id: "nope" }),
      }),
    /blocked/,
  );
}
