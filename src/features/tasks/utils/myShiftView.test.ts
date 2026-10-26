import "@/i18n/config";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withChecklistAddress } from "@/features/forms/utils/checklistForms";
import { withShiftWeekdayTask, US_FOODS_DELIVERY } from "./shiftWeekdayTask";
import { MyShiftTasks } from "../components/MyShiftTasks";
import { assembleMyShift, checklistAreaFromShift } from "./myShiftView";

const CASHIER_OPENING = {
  id: "form-open",
  title: "Cashier opening",
  settings: withChecklistAddress({}, { area: "cashier", slot: "opening" }),
};
const CASHIER_DAILY = {
  id: "form-daily",
  title: "Cashier daily",
  settings: withChecklistAddress({}, { area: "cashier", slot: "daily" }),
};
const CASHIER_CLOSING = {
  id: "form-close",
  title: "Cashier closing",
  settings: withChecklistAddress({}, { area: "cashier", slot: "closing" }),
};

export function runMyShiftViewTests() {
  assert.equal(
    checklistAreaFromShift({ role: "Cashier", title: "Morning" }),
    "cashier",
  );
  assert.equal(
    checklistAreaFromShift({ role: "Team", title: "Supervisor close" }),
    "supervisor",
  );
  assert.equal(checklistAreaFromShift({ role: "Cook", title: "Line" }), null);

  const ready = assembleMyShift({
    viewerId: "ada",
    now: new Date("2026-10-23T14:00:00"),
    schedules: [
      {
        id: "shift-ada",
        role: "cashier",
        title: "Cashier",
        start_time: "2026-10-23T12:00:00.000Z",
        end_time: "2026-10-23T20:00:00.000Z",
        user_id: "ada",
        is_published: true,
        is_template: false,
      },
      {
        id: "shift-ben",
        role: "cashier",
        title: "Cashier",
        start_time: "2026-10-24T12:00:00.000Z",
        end_time: "2026-10-24T20:00:00.000Z",
        user_id: "ben",
        is_published: true,
        is_template: false,
      },
    ],
    forms: [CASHIER_OPENING, CASHIER_DAILY, CASHIER_CLOSING],
    fields: [
      {
        id: "drawer",
        form_id: "form-open",
        label: "Count the drawer",
        field_order: 1,
      },
    ],
    submissions: [
      {
        form_id: "form-close",
        submitted_at: "2026-10-22T21:00:00.000Z",
        submitted_by: "ben",
        submission_data: { additional_information: "No coins in the drawer" },
      },
    ],
    tasks: [
      {
        id: "delivery",
        title: US_FOODS_DELIVERY.title,
        links: withShiftWeekdayTask({}, US_FOODS_DELIVERY),
      },
    ],
  });

  assert.equal(ready.kind, "ready");
  if (ready.kind !== "ready") return;
  assert.equal(ready.view.area, "cashier");
  assert.deepEqual(
    ready.view.lists.map((list) => list.formId),
    ["form-open", "form-daily", "form-close"],
  );
  assert.deepEqual(ready.view.lists[0]?.notes, ["No coins in the drawer"]);
  assert.deepEqual(ready.view.lists[1]?.notes, []);
  assert.equal(ready.view.lists[0]?.items[0]?.label, "Count the drawer");
  assert.equal(ready.view.weekdayTasks.length, 0);
  assert.equal(ready.view.shiftTasks.length, 0);

  const friday = assembleMyShift({
    viewerId: "sam",
    now: new Date("2026-10-23T15:00:00"),
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
    submissions: [
      {
        form_id: "missing",
        submitted_at: "2026-10-22T21:00:00.000Z",
        submitted_by: "sam",
        submission_data: {},
      },
    ],
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
  assert.equal(friday.view.lists[0]?.notes.length, 0);
  assert.equal(friday.view.weekdayTasks[0]?.title, "Organize the US Foods delivery");
  assert.deepEqual(friday.view.weekdayTasks[0]?.stations, [
    "front_of_house",
    "back_of_house",
  ]);

  const html = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board: friday,
      onOpenList: () => undefined,
    }),
  );
  assert.match(html, /my-shift-tasks/);
  assert.match(html, /Organize the US Foods delivery/);
  assert.match(html, /my-shift-list-opening/);
  assert.equal(html.includes("No coins in the drawer"), false);

  const noted = ready.view;
  const notedHtml = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board: { kind: "ready", view: noted, shiftTitle: "Cashier", shiftStartsAt: "", shiftEndsAt: null },
      onOpenList: () => undefined,
    }),
  );
  assert.match(notedHtml, /No coins in the drawer/);
  assert.match(notedHtml, /my-shift-opening-notes/);
  const openingIndex = notedHtml.indexOf("my-shift-list-opening");
  const noteIndex = notedHtml.indexOf("No coins in the drawer");
  const dailyIndex = notedHtml.indexOf("my-shift-list-daily");
  assert.ok(openingIndex >= 0 && noteIndex > openingIndex && noteIndex < dailyIndex);

  const empty = assembleMyShift({
    viewerId: "ada",
    now: new Date("2026-10-23T14:00:00"),
    schedules: [],
    forms: [],
    fields: [],
    submissions: [],
    tasks: [],
  });
  assert.equal(empty.kind, "empty");
  const emptyHtml = renderToStaticMarkup(
    createElement(MyShiftTasks, { board: empty, onOpenList: () => undefined }),
  );
  assert.match(emptyHtml, /my-shift-empty/);

  const cook = assembleMyShift({
    viewerId: "lee",
    now: new Date("2026-10-23T15:00:00"),
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
    forms: [],
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
  assert.equal(cook.view.area, null);
  assert.equal(cook.view.lists.length, 0);
  assert.equal(cook.view.shiftTasks[0]?.title, "Clean the restroom");
  assert.equal(cook.view.shiftTasks[0]?.description, "After lunch");
  assert.equal(cook.view.shiftTasks[0]?.formId, "form-close-up");
  assert.equal(cook.view.shiftTasks[0]?.assigneeCount, 2);

  const cookHtml = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board: cook,
      onOpenList: () => undefined,
      onFillForm: () => undefined,
      onCompleteTask: () => undefined,
    }),
  );
  assert.match(cookHtml, /Clean the restroom/);
  assert.match(cookHtml, /After lunch/);
  assert.match(cookHtml, /my-shift-task-fill-restroom/);
  assert.match(cookHtml, /my-shift-task-done-restroom/);
  assert.equal(cookHtml.includes("my-shift-list-opening"), false);
}
