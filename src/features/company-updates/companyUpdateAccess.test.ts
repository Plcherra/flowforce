import assert from "node:assert/strict";

import {
  canManageCompanyUpdates,
  companyUpdateGoesLiveAt,
  isCompanyUpdateDue,
  normalizeCompanyUpdateViewMode,
  sanitizeUpdateSearch,
} from "./companyUpdateAccess";

const scheduled = {
  status: "scheduled" as const,
  scheduledDate: "2026-10-26",
  publishingSettings: {
    publishNow: false,
    scheduledDate: "2026-10-26",
    scheduledTime: "09:00",
    notifications: {
      email: false,
      push: false,
      inApp: false,
      reminders: false,
    },
    engagement: {
      allowLikes: true,
      allowComments: true,
      allowSharing: false,
      requireConfirmation: false,
      showAsPopup: false,
    },
    authorAttribution: true,
  },
};

export function runCompanyUpdateAccessTests() {
  assert.equal(canManageCompanyUpdates({ role: "owner" }), true);
  assert.equal(canManageCompanyUpdates({ role: "company_admin" }), true);
  assert.equal(canManageCompanyUpdates({ role: "Administrator" }), true);
  assert.equal(canManageCompanyUpdates({ role: "manager" }), true);
  assert.equal(canManageCompanyUpdates({ role: "supervisor" }), true);
  assert.equal(canManageCompanyUpdates({ role: "staff" }), false);
  assert.equal(canManageCompanyUpdates({ role: "employee" }), false);
  assert.equal(canManageCompanyUpdates({ role: "team_member" }), false);
  assert.equal(canManageCompanyUpdates({ role: "" }), false);
  assert.equal(
    canManageCompanyUpdates({
      role: "staff",
      can: (key) => key === "systemSettings",
    }),
    true,
  );
  assert.equal(
    canManageCompanyUpdates({
      role: "staff",
      can: (key) => key === "admin.settings",
    }),
    true,
  );
  assert.equal(
    canManageCompanyUpdates({
      role: "staff",
      can: () => false,
    }),
    false,
  );

  assert.equal(normalizeCompanyUpdateViewMode("grid"), "grid");
  assert.equal(normalizeCompanyUpdateViewMode("list"), "list");
  assert.equal(normalizeCompanyUpdateViewMode("feed"), "feed");
  assert.equal(normalizeCompanyUpdateViewMode("table"), "feed");
  assert.equal(normalizeCompanyUpdateViewMode(null), "feed");

  const before = new Date("2026-10-26T08:59:00Z");
  const after = new Date("2026-10-26T09:00:00Z");
  assert.equal(isCompanyUpdateDue(scheduled, before), false);
  assert.equal(isCompanyUpdateDue(scheduled, after), true);
  const eastern = {
    ...scheduled,
    publishingSettings: {
      ...scheduled.publishingSettings,
      timezone: "America/New_York",
    },
  };
  assert.equal(
    isCompanyUpdateDue(eastern, new Date("2026-10-26T12:59:00Z")),
    false,
  );
  assert.equal(
    isCompanyUpdateDue(eastern, new Date("2026-10-26T13:00:00Z")),
    true,
  );
  assert.equal(
    companyUpdateGoesLiveAt(eastern)?.toISOString(),
    "2026-10-26T13:00:00.000Z",
  );
  assert.equal(
    isCompanyUpdateDue({ ...scheduled, status: "published" }, after),
    false,
  );
  assert.equal(
    companyUpdateGoesLiveAt({
      ...scheduled,
      scheduledDate: null,
    })?.toISOString(),
    "2026-10-26T09:00:00.000Z",
  );
  assert.equal(
    companyUpdateGoesLiveAt({
      ...scheduled,
      scheduledDate: "soon",
      publishingSettings: {
        ...scheduled.publishingSettings,
        scheduledDate: undefined,
      },
    }),
    null,
  );

  assert.equal(sanitizeUpdateSearch("walk-in, ready"), "walk-in ready");
  assert.equal(sanitizeUpdateSearch("100%_done"), "100 done");
}
