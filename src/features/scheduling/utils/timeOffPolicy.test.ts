import assert from "node:assert/strict";
import {
  policyAppliesTo,
  remainingBalances,
  requestFitsPolicy,
  type TimeOffPolicy,
  type TimeOffUsage,
} from "./timeOffPolicy";

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
}
