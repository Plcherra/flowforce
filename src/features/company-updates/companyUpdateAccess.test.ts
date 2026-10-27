import assert from "node:assert/strict";

import {
  applyEngagementCounts,
  canManageCompanyUpdates,
  companyUpdateGoesLiveAt,
  companyUpdateLoadMessage,
  isCompanyUpdateDue,
  normalizeCompanyUpdateViewMode,
  plainUpdateText,
  readCompanyUpdateCount,
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

  assert.equal(readCompanyUpdateCount(null), 0);
  assert.equal(readCompanyUpdateCount(undefined), 0);
  assert.equal(readCompanyUpdateCount(4), 4);
  assert.equal(readCompanyUpdateCount("3"), 3);
  assert.equal(readCompanyUpdateCount("nope"), 0);

  const zodError = new Error(
    '[{"path":["likes_count"],"message":"Expected number, received null"}]',
  );
  zodError.name = "ZodError";
  assert.equal(
    companyUpdateLoadMessage(zodError, "Please try again."),
    "Please try again.",
  );
  assert.equal(
    companyUpdateLoadMessage(new Error("permission denied"), "Please try again."),
    "permission denied",
  );

  assert.equal(
    plainUpdateText(
      "<p>This is an urgent announcement that requires immediate attention</p>",
    ),
    "This is an urgent announcement that requires immediate attention",
  );
  assert.equal(plainUpdateText("A &amp; B"), "A & B");

  const [counted] = applyEngagementCounts(
    [
      {
        id: "update-1",
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
      },
    ],
    [
      { update_id: "update-1", reaction_type: "like" },
      { update_id: "update-1", reaction_type: "view" },
      { update_id: "other", reaction_type: "like" },
    ],
    [{ update_id: "update-1" }, { update_id: "update-1" }],
  );
  assert.equal(counted?.likes_count, 1);
  assert.equal(counted?.views_count, 1);
  assert.equal(counted?.comments_count, 2);
}
