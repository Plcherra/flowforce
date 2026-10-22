import assert from "node:assert/strict";
import {
  policyAppliesTo,
  balanceLabel,
  balanceLabelForPerson,
  remainingBalances,
  requestFitsPolicy,
  teamRequestBalanceLabel,
  type TimeOffPolicy,
  type TimeOffUsage,
} from "./timeOffPolicy";
import type { CompanyPolicyRecord } from "./companyPolicy";

const weekend: TimeOffPolicy = {
  id: "weekend",
  name: "Weekend",
  unit: "days",
  capWeek: null,
  capMonth: 2,
  capYear: 24,
  eligibleWeekdays: [0, 6],
  noticeDays: 0,
  appliesToRoleIds: [],
  appliesToUserIds: [],
};

const weekday: TimeOffPolicy = {
  id: "weekday",
  name: "Weekday",
  unit: "days",
  capWeek: null,
  capMonth: null,
  capYear: 90,
  eligibleWeekdays: [1, 2, 3, 4, 5],
  noticeDays: 7,
  appliesToRoleIds: [],
  appliesToUserIds: [],
};

export function runTimeOffPolicyTests() {
  const saturdaySunday = requestFitsPolicy({
    policy: weekend,
    startDate: "2026-10-03",
    endDate: "2026-10-04",
    usage: [],
    asOf: "2026-10-01",
  });
  assert.equal(saturdaySunday.ok, true);
  if (saturdaySunday.ok) assert.equal(saturdaySunday.amount, 2);

  const friday = requestFitsPolicy({
    policy: weekend,
    startDate: "2026-10-02",
    endDate: "2026-10-03",
    usage: [],
    asOf: "2026-10-01",
  });
  assert.equal(friday.ok, false);

  const monthFull: TimeOffUsage[] = [
    {
      policyId: "weekend",
      startDate: "2026-10-03",
      endDate: "2026-10-04",
      status: "pending",
    },
  ];
  const thirdDay = requestFitsPolicy({
    policy: weekend,
    startDate: "2026-10-10",
    endDate: "2026-10-10",
    usage: monthFull,
    asOf: "2026-10-01",
  });
  assert.equal(thirdDay.ok, false);

  const yearFull = Array.from({ length: 12 }, (_, month) => {
    const saturday = new Date(Date.UTC(2026, month, 1));
    while (saturday.getUTCDay() !== 6) saturday.setUTCDate(saturday.getUTCDate() + 1);
    const sunday = new Date(saturday);
    sunday.setUTCDate(sunday.getUTCDate() + 1);
    return {
      policyId: "weekend",
      startDate: saturday.toISOString().slice(0, 10),
      endDate: sunday.toISOString().slice(0, 10),
      status: "approved",
    };
  });
  const overYear = requestFitsPolicy({
    policy: { ...weekend, capMonth: null },
    startDate: "2026-12-12",
    endDate: "2026-12-13",
    usage: yearFull,
    asOf: "2026-01-01",
  });
  assert.equal(overYear.ok, false);

  const acrossMonths = requestFitsPolicy({
    policy: weekend,
    startDate: "2026-10-31",
    endDate: "2026-11-01",
    usage: monthFull,
    asOf: "2026-10-01",
  });
  assert.equal(acrossMonths.ok, false);

  const tooSoon = requestFitsPolicy({
    policy: weekday,
    startDate: "2026-10-07",
    endDate: "2026-10-07",
    usage: [],
    asOf: "2026-10-01",
  });
  assert.equal(tooSoon.ok, false);

  const withNotice = requestFitsPolicy({
    policy: weekday,
    startDate: "2026-10-12",
    endDate: "2026-10-16",
    usage: [],
    asOf: "2026-10-01",
  });
  assert.equal(withNotice.ok, true);
  if (withNotice.ok) assert.equal(withNotice.amount, 5);

  const balances = remainingBalances({
    policies: [weekend, weekday],
    usage: monthFull,
    asOf: "2026-10-01",
  });
  assert.equal(balances[0]?.month?.remaining, 0);
  assert.equal(balances[0]?.year?.remaining, 22);
  assert.equal(balances[1]?.year?.remaining, 90);
  assert.equal(balances[1]?.month, null);

  const hours = requestFitsPolicy({
    policy: { ...weekend, unit: "hours", capMonth: 16, capYear: null },
    startDate: "2026-10-03",
    endDate: "2026-10-03",
    usage: [],
    asOf: "2026-10-01",
  });
  assert.equal(hours.ok, true);
  if (hours.ok) assert.equal(hours.amount, 8);

  const minutes = requestFitsPolicy({
    policy: { ...weekend, unit: "minutes", capMonth: 480, capYear: null },
    startDate: "2026-10-03",
    endDate: "2026-10-03",
    usage: [],
    asOf: "2026-10-01",
  });
  assert.equal(minutes.ok, true);
  if (minutes.ok) assert.equal(minutes.amount, 480);

  const limited: TimeOffPolicy = {
    ...weekday,
    id: "role-only",
    appliesToRoleIds: ["role-1"],
    appliesToUserIds: [],
  };
  assert.equal(policyAppliesTo(limited, "person", "role-1"), true);
  assert.equal(policyAppliesTo(limited, "person", "role-2"), false);
  assert.equal(policyAppliesTo(weekend, "person", null), true);

  const personA: TimeOffUsage = {
    policyId: "weekend",
    startDate: "2026-10-03",
    endDate: "2026-10-03",
    status: "approved",
    userId: "person-a",
  };
  const personB: TimeOffUsage = {
    policyId: "weekend",
    startDate: "2026-10-04",
    endDate: "2026-10-04",
    status: "approved",
    userId: "person-b",
  };
  const shared = [personA, personB];
  const personABalances = remainingBalances({
    policies: [weekend],
    usage: shared,
    userId: "person-a",
    asOf: "2026-10-01",
  });
  assert.equal(personABalances[0]?.month?.remaining, 1);
  assert.equal(personABalances[0]?.year?.remaining, 23);
  assert.match(balanceLabel(personABalances[0]!), /1 days left this month/);
  const personBBalances = remainingBalances({
    policies: [weekend],
    usage: shared,
    userId: "person-b",
    asOf: "2026-10-01",
  });
  assert.equal(personBBalances[0]?.month?.remaining, 1);
  assert.equal(
    balanceLabelForPerson({
      policy: null,
      usage: shared,
      userId: "person-a",
      asOf: "2026-10-01",
    }),
    null,
  );

  const weekendRecord: CompanyPolicyRecord = {
    id: "weekend",
    companyId: "company-1",
    name: "Weekend",
    type: "time_off",
    unit: "days",
    capWeek: null,
    capMonth: 2,
    capYear: 24,
    eligibleWeekdays: [0, 6],
    noticeDays: 0,
    archivedAt: null,
    assignments: [{ targetType: "company", targetId: "company-1" }],
  };
  assert.equal(
    teamRequestBalanceLabel({
      policyId: "weekend",
      userId: "person-a",
      companyId: "company-1",
      policies: [weekendRecord],
      usage: shared,
      asOf: "2026-10-01",
    }),
    balanceLabel(personABalances[0]!),
  );
  assert.equal(
    teamRequestBalanceLabel({
      policyId: null,
      userId: "person-a",
      companyId: "company-1",
      policies: [weekendRecord],
      usage: shared,
      asOf: "2026-10-01",
    }),
    null,
  );

  assert.deepEqual(weekend.eligibleWeekdays, [0, 6]);
  assert.equal(weekend.capMonth, 2);
  assert.equal(weekend.capYear, 24);
  assert.equal(weekday.noticeDays, 7);
  assert.equal(weekday.capYear, 90);

  const weekCap: TimeOffPolicy = {
    ...weekend,
    id: "week-cap",
    capWeek: 1,
    capMonth: null,
    capYear: null,
  };
  const sameWeek = requestFitsPolicy({
    policy: weekCap,
    startDate: "2026-10-10",
    endDate: "2026-10-10",
    usage: [
      {
        policyId: "week-cap",
        startDate: "2026-10-04",
        endDate: "2026-10-04",
        status: "approved",
      },
    ],
    asOf: "2026-10-01",
  });
  assert.equal(sameWeek.ok, false);
  const nextWeek = requestFitsPolicy({
    policy: weekCap,
    startDate: "2026-10-11",
    endDate: "2026-10-11",
    usage: [
      {
        policyId: "week-cap",
        startDate: "2026-10-04",
        endDate: "2026-10-04",
        status: "approved",
      },
    ],
    asOf: "2026-10-01",
  });
  assert.equal(nextWeek.ok, true);

  const allCaps: TimeOffPolicy = {
    id: "all-caps",
    name: "All caps",
    unit: "days",
    capWeek: 1,
    capMonth: 2,
    capYear: 3,
    eligibleWeekdays: [0, 1, 2, 3, 4, 5, 6],
    noticeDays: 0,
    appliesToRoleIds: [],
    appliesToUserIds: [],
  };
  const usedDay = (startDate: string): TimeOffUsage => ({
    policyId: "all-caps",
    startDate,
    endDate: startDate,
    status: "approved",
  });
  assert.equal(
    requestFitsPolicy({
      policy: allCaps,
      startDate: "2026-01-05",
      endDate: "2026-01-05",
      usage: [usedDay("2026-01-04")],
      asOf: "2026-01-01",
    }).ok,
    false,
  );
  assert.equal(
    requestFitsPolicy({
      policy: allCaps,
      startDate: "2026-01-18",
      endDate: "2026-01-18",
      usage: [usedDay("2026-01-04"), usedDay("2026-01-11")],
      asOf: "2026-01-01",
    }).ok,
    false,
  );
  assert.equal(
    requestFitsPolicy({
      policy: allCaps,
      startDate: "2026-02-08",
      endDate: "2026-02-08",
      usage: [usedDay("2026-01-04"), usedDay("2026-01-11"), usedDay("2026-02-01")],
      asOf: "2026-01-01",
    }).ok,
    false,
  );

  const ignored: TimeOffUsage[] = [
    {
      policyId: "weekend",
      startDate: "2026-10-03",
      endDate: "2026-10-03",
      status: "denied",
    },
    {
      policyId: "weekend",
      startDate: "2026-10-04",
      endDate: "2026-10-04",
      status: "rejected",
    },
  ];
  const afterIgnored = remainingBalances({
    policies: [weekend],
    usage: ignored,
    asOf: "2026-10-01",
  });
  assert.equal(afterIgnored[0]?.month?.remaining, 2);
  const afterPending = remainingBalances({
    policies: [weekend],
    usage: [
      {
        policyId: "weekend",
        startDate: "2026-10-03",
        endDate: "2026-10-03",
        status: "pending",
      },
    ],
    asOf: "2026-10-01",
  });
  assert.equal(afterPending[0]?.month?.remaining, 1);

  const listedPeople: TimeOffPolicy = {
    ...weekend,
    id: "listed-people",
    appliesToRoleIds: [],
    appliesToUserIds: ["person-a"],
  };
  assert.equal(policyAppliesTo(listedPeople, "person-a", null), true);
  assert.equal(policyAppliesTo(listedPeople, "person-b", null), false);
  assert.equal(
    requestFitsPolicy({
      policy: listedPeople,
      startDate: "2026-10-03",
      endDate: "2026-10-03",
      usage: [],
      userId: "person-a",
      asOf: "2026-10-01",
    }).ok,
    true,
  );
  assert.equal(
    requestFitsPolicy({
      policy: listedPeople,
      startDate: "2026-10-03",
      endDate: "2026-10-03",
      usage: [],
      userId: "person-b",
      asOf: "2026-10-01",
    }).ok,
    false,
  );
  assert.equal(
    requestFitsPolicy({
      policy: weekend,
      startDate: "2026-10-03",
      endDate: "2026-10-03",
      usage: [],
      userId: "person-b",
      asOf: "2026-10-01",
    }).ok,
    true,
  );

  const mixedDays = requestFitsPolicy({
    policy: weekend,
    startDate: "2026-10-04",
    endDate: "2026-10-05",
    usage: [],
    asOf: "2026-10-01",
  });
  assert.equal(mixedDays.ok, false);
}
