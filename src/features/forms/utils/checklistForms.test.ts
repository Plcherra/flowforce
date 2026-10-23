import assert from "node:assert/strict";
import {
  checklistAddresses,
  findChecklistForm,
  readChecklistAddress,
  withChecklistAddress,
} from "./checklistForms";

export function runChecklistFormTests() {
  const addresses = checklistAddresses();
  assert.deepEqual(
    addresses.filter((address) => address.area === "cashier").map((address) => address.slot),
    ["opening", "daily", "closing"],
  );
  assert.deepEqual(
    addresses.filter((address) => address.area === "supervisor").map((address) => address.slot),
    ["opening", "daily", "closing"],
  );

  const forms = addresses.map((address) => ({
    id: `${address.area}-${address.slot}`,
    settings: withChecklistAddress({ contentSourceLocale: "en" }, address),
  }));

  for (const address of addresses) {
    const form = findChecklistForm(forms, address.area, address.slot);
    assert.equal(form?.id, `${address.area}-${address.slot}`);
    assert.deepEqual(readChecklistAddress(form?.settings), address);
    assert.equal(
      (form?.settings as { contentSourceLocale?: string }).contentSourceLocale,
      "en",
    );
    assert.equal("taskType" in (form ?? {}), false);
  }

  assert.equal(findChecklistForm(forms, "cashier", "closing")?.id, "cashier-closing");
  assert.equal(
    findChecklistForm(
      [{ id: "plain", settings: { contentSourceLocale: "en" } }],
      "supervisor",
      "opening",
    ),
    null,
  );
}
