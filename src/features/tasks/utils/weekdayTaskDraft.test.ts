import "@/i18n/config";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WeekdayTaskForm } from "../components/WeekdayTaskForm";
import { assembleMyShift } from "./myShiftView";
import { readShiftWeekdayTask } from "./shiftWeekdayTask";
import { weekdayTaskInsert, weekdayTaskRecord } from "./weekdayTaskDraft";

const SHIFT = {
  id: "shift",
  title: "Supervisor",
  start_time: "2026-10-23T12:00:00.000Z",
  end_time: "2026-10-23T20:00:00.000Z",
  is_published: true,
  is_template: false,
};

export function runWeekdayTaskDraftTests() {
  const task = weekdayTaskRecord({
    title: " Organize the US Foods delivery ",
    area: "supervisor",
    weekdays: ["fri", "mon", "wed"],
    stations: ["back_of_house", "front_of_house"],
  });
  assert.ok(task);
  assert.equal(task?.slot, null);
  assert.deepEqual(task?.weekdays, ["mon", "wed", "fri"]);
  assert.deepEqual(task?.stations, ["front_of_house", "back_of_house"]);
  assert.equal(
    weekdayTaskRecord({
      title: "Delivery",
      area: "supervisor",
      weekdays: [],
      stations: ["front_of_house"],
    }),
    null,
  );

  const inserted = weekdayTaskInsert(task!, "owner");
  assert.equal(inserted.source, "schedule");
  assert.equal(readShiftWeekdayTask(inserted.links)?.slot, null);

  const base = {
    now: new Date("2026-10-23T15:00:00.000Z"),
    forms: [],
    fields: [],
    submissions: [],
    tasks: [{ id: "delivery", title: task!.title, links: inserted.links }],
  };
  const supervisor = assembleMyShift({
    ...base,
    viewerId: "sam",
    schedules: [{ ...SHIFT, role: "supervisor", user_id: "sam" }],
  });
  const cashier = assembleMyShift({
    ...base,
    viewerId: "ada",
    schedules: [{ ...SHIFT, id: "c", role: "cashier", title: "Cashier", user_id: "ada" }],
  });
  assert.equal(supervisor.kind, "ready");
  assert.equal(cashier.kind, "ready");
  if (supervisor.kind !== "ready" || cashier.kind !== "ready") return;
  assert.equal(supervisor.view.weekdayTasks[0]?.title, "Organize the US Foods delivery");
  assert.equal(cashier.view.weekdayTasks.length, 0);
  assert.equal(
    supervisor.view.lists.every((list) => list.items.length === 0),
    true,
  );

  const html = renderToStaticMarkup(
    createElement(WeekdayTaskForm, {
      title: "Organize the US Foods delivery",
      area: "supervisor",
      weekdays: ["mon", "wed", "fri"],
      stations: ["front_of_house", "back_of_house"],
      onTitle: () => undefined,
      onArea: () => undefined,
      onToggleWeekday: () => undefined,
      onToggleStation: () => undefined,
      onSave: () => undefined,
    }),
  );
  assert.match(html, /weekday-task-setup/);
  assert.match(html, /weekday-fri/);
  assert.match(html, /station-front_of_house/);
  assert.match(html, /station-back_of_house/);
}
