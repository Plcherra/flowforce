import assert from "node:assert/strict";
import {
  defaultFormDistribution,
  withFormDistribution,
} from "@/features/forms/utils/formDistribution";
import { formsForScheduledRole, scheduledRoleMatches } from "./roleShiftLists";

const ROLES = [
  { id: "role-barista", name: "Barista" },
  { id: "role-cook", name: "Cook" },
];

const NOW = new Date("2026-11-06T15:00:00.000Z");

function attached(
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

export function runRoleShiftListTests() {
  assert.equal(
    scheduledRoleMatches("Barista", ["role-barista"], ROLES),
    true,
  );
  assert.equal(
    scheduledRoleMatches("role-barista", ["role-barista"], []),
    true,
  );
  assert.equal(scheduledRoleMatches("Barista", ["role-cook"], ROLES), false);
  assert.equal(scheduledRoleMatches("Barista", [], ROLES), false);

  const forms = [
    attached("open", "Open bar", ["role-barista"], {
      showFrom: "2026-11-06T12:00:00.000Z",
      dueAt: "2026-11-06T22:00:00.000Z",
    }),
    attached("late", "Later bar", ["role-barista"], {
      dueAt: "2026-11-07T22:00:00.000Z",
    }),
    attached("past", "Past bar", ["role-barista"], {
      dueAt: "2026-11-06T14:00:00.000Z",
    }),
    attached("early", "Not yet", ["role-barista"], {
      showFrom: "2026-11-06T18:00:00.000Z",
      dueAt: "2026-11-06T22:00:00.000Z",
    }),
    attached("cook", "Cook list", ["role-cook"]),
    attached("draft", "Draft bar", ["role-barista"], {}, "draft"),
    {
      id: "slot",
      title: "Opening slot",
      status: "published",
      settings: { checklist: { area: "cashier", slot: "opening" } },
    },
  ];

  assert.deepEqual(
    formsForScheduledRole({
      forms,
      scheduledRole: "Barista",
      roles: ROLES,
      now: NOW,
    }).map((form) => form.id),
    ["open", "late"],
  );
}
