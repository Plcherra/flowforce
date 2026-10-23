import "@/i18n/config";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChecklistSetupForm } from "@/features/tasks/components/ChecklistSetupForm";
import { readChecklistAddress, withChecklistAddress } from "./checklistForms";
import { assignChecklistAddress } from "./assignChecklistForm";

export function runAssignChecklistFormTests() {
  const forms = [
    { id: "a", title: "Drawer count", settings: { language: "en" } },
    {
      id: "b",
      title: "Old opening",
      settings: withChecklistAddress({ language: "es" }, { area: "cashier", slot: "opening" }),
    },
  ];
  const assigned = assignChecklistAddress(forms, "a", {
    area: "cashier",
    slot: "opening",
  });
  const nextA = assigned.find((row) => row.id === "a")?.settings;
  const nextB = assigned.find((row) => row.id === "b")?.settings;
  assert.deepEqual(readChecklistAddress(nextA), { area: "cashier", slot: "opening" });
  assert.equal(nextA?.language, "en");
  assert.equal(readChecklistAddress(nextB), null);
  assert.equal(nextB?.language, "es");

  const cleared = assignChecklistAddress(
    [
      { id: "a", settings: nextA },
      { id: "b", settings: nextB },
    ],
    null,
    { area: "cashier", slot: "opening" },
  );
  assert.equal(cleared.length, 1);
  assert.equal(readChecklistAddress(cleared[0]?.settings), null);
  assert.equal(cleared[0]?.settings.language, "en");

  const html = renderToStaticMarkup(
    createElement(ChecklistSetupForm, {
      forms: [
        { id: "a", title: "Drawer count" },
        { id: "b", title: "Old opening" },
      ],
      selected: {
        "cashier:opening": "a",
        "cashier:daily": "",
        "cashier:closing": "",
        "supervisor:opening": "",
        "supervisor:daily": "",
        "supervisor:closing": "",
      },
      onSelect: () => undefined,
      onSave: () => undefined,
    }),
  );
  assert.match(html, /checklist-setup/);
  assert.match(html, /checklist-slot-cashier-opening/);
  assert.match(html, /checklist-slot-supervisor-closing/);
  assert.equal(html.split("checklist-slot-").length - 1, 6);
}
