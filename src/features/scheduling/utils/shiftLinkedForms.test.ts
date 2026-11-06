import assert from "node:assert/strict";
import {
  defaultFormDistribution,
  withFormDistribution,
} from "@/features/forms/utils/formDistribution";
import { formsLinkedToShift } from "./shiftLinkedForms";

const ROLES = [{ id: "role-barista", name: "Barista" }];

const forms = [
  {
    id: "bar-list",
    title: "Open the bar",
    status: "published",
    settings: withFormDistribution(
      {},
      {
        ...defaultFormDistribution(),
        recordKind: "list" as const,
        roleIds: ["role-barista"],
        dueAt: "2026-11-06T22:00:00.000Z",
      },
    ),
  },
  {
    id: "draft-list",
    title: "Draft bar",
    status: "draft",
    settings: withFormDistribution(
      {},
      {
        ...defaultFormDistribution(),
        recordKind: "list" as const,
        roleIds: ["role-barista"],
      },
    ),
  },
];

export function runShiftLinkedFormsTests() {
  const barista = formsLinkedToShift({ role: "Barista", forms, roles: ROLES });
  assert.equal(barista.length, 1);
  assert.equal(barista[0]?.formId, "bar-list");
  assert.equal(barista[0]?.href, "/app/forms?form=bar-list");
  assert.equal(barista[0]?.dueAt, "2026-11-06T22:00:00.000Z");

  const cook = formsLinkedToShift({ role: "Cook", forms, roles: ROLES });
  assert.deepEqual(cook, []);
}
