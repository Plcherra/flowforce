import "@/i18n/client";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  defaultFormDistribution,
  withFormDistribution,
} from "@/features/forms/utils/formDistribution";
import { withChecklistAddress } from "@/features/forms/utils/checklistForms";
import { withShiftWeekdayTask, US_FOODS_DELIVERY } from "./shiftWeekdayTask";
import { MyShiftTasks } from "../components/MyShiftTasks";
import {
  assembleMyShift,
  checklistAreaFromShift,
  shiftTaskMarkDoneAllowed,
} from "./myShiftView";

const ROLES = [
  { id: "role-barista", name: "Barista" },
  { id: "role-cook", name: "Cook" },
];

const NOW = new Date("2026-10-23T14:00:00.000Z");

function listForm(
  id: string,
  title: string,
  roleIds: string[],
  times: { showFrom?: string | null; dueAt?: string | null } = {},
  status = "published",
) {
  return {
    id,
    title,
    status,
    settings: withFormDistribution(
      {},
      {
        ...defaultFormDistribution(),
        recordKind: "list" as const,
        roleIds,
        showFrom: times.showFrom ?? null,
        dueAt: times.dueAt ?? null,
      },
    ),
  };
}

const OPEN = listForm("form-open", "Open the bar", ["role-barista"], {
  showFrom: "2026-10-23T12:00:00.000Z",
  dueAt: "2026-10-23T22:00:00.000Z",
});

export function runMyShiftViewTests() {
  assert.equal(checklistAreaFromShift({ role: "Cashier", title: "Morning" }), "cashier");
  assert.equal(
    checklistAreaFromShift({ role: "Team", title: "Supervisor close" }),
    "supervisor",
  );
  assert.equal(checklistAreaFromShift({ role: "Cook", title: "Line" }), null);

  const published = {
    id: "shift-ada",
    role: "Barista",
    title: "Barista",
    start_time: "2026-10-23T12:00:00.000Z",
    end_time: "2026-10-23T20:00:00.000Z",
    user_id: "ada",
    is_published: true,
    is_template: false,
  };
  const forms = [
    OPEN,
    listForm("form-past", "Past bar", ["role-barista"], {
      dueAt: "2026-10-23T13:00:00.000Z",
    }),
    listForm("form-later", "Not yet", ["role-barista"], {
      showFrom: "2026-10-23T18:00:00.000Z",
    }),
    listForm("form-cook", "Cook list", ["role-cook"]),
    listForm("form-draft", "Draft bar", ["role-barista"], {}, "draft"),
    {
      id: "form-slot",
      title: "Cashier opening",
      status: "published",
      settings: withChecklistAddress({}, { area: "cashier", slot: "opening" }),
    },
  ];
  const fields = [
    { id: "drawer", form_id: "form-open", label: "Count the drawer", field_order: 1 },
  ];

  const ready = assembleMyShift({
    viewerId: "ada",
    now: NOW,
    roles: ROLES,
    schedules: [
      published,
      {
        ...published,
        id: "draft",
        role: "Cook",
        is_published: false,
        user_id: "ada",
      },
    ],
    forms,
    fields,
    submissions: [
      {
        form_id: "form-open",
        submitted_at: "2026-10-23T13:00:00.000Z",
        submitted_by: "ada",
        submission_data: { drawer: true },
      },
    ],
    tasks: [],
  });
  assert.equal(ready.kind, "ready");
  if (ready.kind !== "ready") return;
  assert.deepEqual(
    ready.view.lists.map((list) => list.formId),
    ["form-open"],
  );
  assert.equal(ready.view.lists[0]?.items[0]?.done, true);
  assert.equal(ready.view.lists[0]?.dueAt, "2026-10-23T22:00:00.000Z");

  const html = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board: ready,
      onOpenList: () => undefined,
    }),
  );
  assert.match(html, /my-shift-list-form-open/);
  assert.match(html, /my-shift-open-form-open/);
  assert.equal(html.includes("my-shift-list-opening"), false);
  assert.equal(html.includes("Past bar"), false);
  assert.equal(html.includes("Cashier opening"), false);

  const denied = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board: ready,
      scheduleAccess: "denied",
      onOpenList: () => undefined,
    }),
  );
  assert.match(denied, /my-shift-schedule-denied/);
  assert.equal(denied.includes("my-shift-list-form-open"), false);

  const readOnly = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board: ready,
      canFill: false,
      onOpenList: () => undefined,
    }),
  );
  assert.match(readOnly, /my-shift-item-readonly-drawer/);
  assert.equal(readOnly.includes("my-shift-open-form-open"), false);

  const unpublished = assembleMyShift({
    viewerId: "ada",
    now: NOW,
    roles: ROLES,
    schedules: [{ ...published, is_published: false }],
    forms,
    fields,
    submissions: [],
    tasks: [],
  });
  assert.equal(unpublished.kind, "empty");

  const friday = assembleMyShift({
    viewerId: "sam",
    now: new Date("2026-10-23T15:00:00.000Z"),
    schedules: [
      {
        id: "sup",
        role: "supervisor",
        title: "Supervisor",
        start_time: "2026-10-23T12:00:00.000Z",
        end_time: "2026-10-23T20:00:00.000Z",
        user_id: "sam",
        is_published: true,
        is_template: false,
      },
    ],
    forms: [],
    fields: [],
    submissions: [],
    tasks: [
      {
        id: "delivery",
        title: US_FOODS_DELIVERY.title,
        links: withShiftWeekdayTask({}, US_FOODS_DELIVERY),
      },
    ],
  });
  assert.equal(friday.kind, "ready");
  if (friday.kind !== "ready") return;
  assert.equal(friday.view.lists.length, 0);
  assert.equal(friday.view.weekdayTasks[0]?.title, "Organize the US Foods delivery");

  const fridayHtml = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board: friday,
      onOpenList: () => undefined,
    }),
  );
  assert.match(fridayHtml, /Organize the US Foods delivery/);
  assert.equal(fridayHtml.includes("my-shift-list-opening"), false);

  const empty = assembleMyShift({
    viewerId: "ada",
    now: NOW,
    schedules: [],
    forms: [],
    fields: [],
    submissions: [],
    tasks: [],
  });
  assert.equal(empty.kind, "empty");

  const cook = assembleMyShift({
    viewerId: "lee",
    now: NOW,
    roles: ROLES,
    schedules: [
      {
        id: "line",
        role: "Cook",
        title: "Line",
        start_time: "2026-10-23T12:00:00.000Z",
        end_time: "2026-10-23T20:00:00.000Z",
        user_id: "lee",
        is_published: true,
        is_template: false,
      },
    ],
    forms,
    fields: [],
    submissions: [],
    tasks: [
      {
        id: "restroom",
        title: "Clean the restroom",
        description: "After lunch",
        status: "todo",
        assigned_to: "lee",
        links: {
          schedule_id: "line",
          form_id: "form-close-up",
          assignee_ids: ["lee", "ada"],
          starts_at: "2026-10-23T16:00:00.000Z",
          ends_at: "2026-10-23T16:20:00.000Z",
          publish_state: "published",
        },
      },
    ],
  });
  assert.equal(cook.kind, "ready");
  if (cook.kind !== "ready") return;
  assert.deepEqual(
    cook.view.lists.map((list) => list.formId),
    ["form-cook"],
  );
  assert.equal(cook.view.shiftTasks[0]?.title, "Clean the restroom");
  assert.equal(shiftTaskMarkDoneAllowed("todo"), true);
  assert.equal(shiftTaskMarkDoneAllowed("completed"), false);
  assert.equal(shiftTaskMarkDoneAllowed("cancelled"), false);
}
