import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MyShiftTasks } from "../components/MyShiftTasks";
import { checklistSubmissionData } from "./checklistProgress";
import type { AssembledShift } from "./myShiftView";

export function runChecklistProgressTests() {
  const saved = checklistSubmissionData({
    items: [
      { id: "drawer", done: true },
      { id: "mats", done: false },
    ],
    note: "  No coins in the drawer  ",
    includeNote: true,
  });
  assert.equal(saved.drawer, true);
  assert.equal(saved.mats, false);
  assert.equal(saved.additional_information, "No coins in the drawer");

  const blank = checklistSubmissionData({
    items: [{ id: "drawer", done: true }],
    note: "   ",
    includeNote: true,
  });
  assert.equal(Object.hasOwn(blank, "additional_information"), false);
  assert.equal(blank.drawer, true);

  const itemsOnly = checklistSubmissionData({
    items: [{ id: "drawer", done: true }],
    note: "keep me off this save",
    includeNote: false,
  });
  assert.equal(Object.hasOwn(itemsOnly, "additional_information"), false);

  const board: AssembledShift = {
    kind: "ready",
    shiftTitle: "Cashier",
    shiftStartsAt: "2026-10-23T12:00:00.000Z",
    shiftEndsAt: null,
    view: {
      area: "cashier",
      weekdayTasks: [],
      shiftTasks: [],
      lists: [
        {
          slot: "opening",
          formId: "open",
          title: "Cashier opening",
          notes: [],
          savedNote: "",
          items: [{ id: "drawer", label: "Count the drawer", done: false }],
        },
        {
          slot: "daily",
          formId: "daily",
          title: "Cashier daily",
          notes: [],
          savedNote: "",
          items: [],
        },
        {
          slot: "closing",
          formId: "close",
          title: "Cashier closing",
          notes: [],
          savedNote: "",
          items: [],
        },
      ],
    },
  };
  const html = renderToStaticMarkup(
    createElement(MyShiftTasks, {
      board,
      onOpenList: () => undefined,
      onToggleItem: () => undefined,
      onSaveClosingNote: () => undefined,
    }),
  );
  assert.match(html, /my-shift-item-drawer/);
  assert.match(html, /my-shift-closing-note/);
  assert.match(html, /my-shift-save-note/);
}
