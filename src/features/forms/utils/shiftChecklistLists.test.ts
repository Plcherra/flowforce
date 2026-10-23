import assert from "node:assert/strict";
import {
  checklistAddresses,
  withChecklistAddress,
} from "./checklistForms";
import { listsForShift } from "./shiftChecklistLists";

export function runShiftChecklistListTests() {
  const forms = checklistAddresses().map((address) => ({
    id: `${address.area}-${address.slot}`,
    settings: withChecklistAddress(null, address),
  }));

  const cashier = listsForShift(forms, "cashier");
  assert.equal(cashier.opening, forms.find((form) => form.id === "cashier-opening"));
  assert.equal(cashier.daily, forms.find((form) => form.id === "cashier-daily"));
  assert.equal(cashier.closing, forms.find((form) => form.id === "cashier-closing"));
  assert.equal(cashier.opening?.id.startsWith("supervisor"), false);

  const supervisor = listsForShift(forms, "supervisor");
  assert.equal(supervisor.opening?.id, "supervisor-opening");
  assert.equal(supervisor.daily?.id, "supervisor-daily");
  assert.equal(supervisor.closing?.id, "supervisor-closing");
  assert.equal(supervisor.opening, forms.find((form) => form.id === "supervisor-opening"));
}
