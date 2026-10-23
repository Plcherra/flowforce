import assert from "node:assert/strict";
import { withChecklistAddress } from "@/features/forms/utils/checklistForms";
import { formsLinkedToShift } from "./shiftLinkedForms";

const forms = [
  {
    id: "open-form",
    title: "Open drawer",
    settings: withChecklistAddress(null, { area: "cashier", slot: "opening" }),
  },
];

export function runShiftLinkedFormsTests() {
  const cashier = formsLinkedToShift({
    role: "Cashier",
    title: "Cashier - Opening",
    forms,
  });
  assert.equal(cashier.area, "cashier");
  assert.equal(cashier.forms.length, 1);
  assert.equal(cashier.forms[0]?.formId, "open-form");
  assert.equal(cashier.forms[0]?.href, "/app/forms?form=open-form");

  const cook = formsLinkedToShift({ role: "Cook", title: "Cook", forms });
  assert.equal(cook.area, null);
  assert.deepEqual(cook.forms, []);
}
