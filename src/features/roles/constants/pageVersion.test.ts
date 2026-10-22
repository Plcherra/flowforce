import assert from "node:assert/strict";
import {
  pageVersion,
  schedulePageVersion,
  type ActionPageVersion,
} from "./pageVersion";

export function runPageVersionTests() {
  const team = schedulePageVersion({
    viewTeamSchedules: true,
    "schedule.view": true,
  });
  assert.equal(team.team, true);
  assert.equal(team.draft, false);
  assert.equal(team.create, false);
  assert.equal(team.edit, false);
  assert.equal(team.delete, false);

  const oneView = schedulePageVersion({
    viewTeamSchedules: true,
    "schedule.view": false,
  });
  assert.equal(oneView.team, false);

  const draft = schedulePageVersion({
    editSchedules: true,
    "schedule.create": false,
    "schedule.edit": false,
    "schedule.delete": false,
  });
  assert.equal(draft.draft, true);
  assert.equal(draft.create, false);
  assert.equal(draft.edit, false);
  assert.equal(draft.delete, false);

  const createOnly = schedulePageVersion(
    { "schedule.create": true, editSchedules: true },
    4,
  );
  assert.equal(createOnly.create, true);
  assert.equal(createOnly.edit, false);
  assert.equal(createOnly.delete, false);
  assert.equal(createOnly.draft, false);

  const editOnly = schedulePageVersion({ "schedule.edit": true });
  assert.equal(editOnly.edit, true);
  assert.equal(editOnly.create, false);
  assert.equal(editOnly.delete, false);

  const deleteOnly = schedulePageVersion({ "schedule.delete": true });
  assert.equal(deleteOnly.delete, true);
  assert.equal(deleteOnly.create, false);
  assert.equal(deleteOnly.edit, false);

  const samePermissions = {
    "inventory.view": true,
    "inventory.create": true,
    "recognition.edit": true,
    "directory.view": true,
    manageUsers: false,
    "directory.manage": false,
    "onboarding.create": true,
    managePositions: false,
    "onboarding.delete": false,
  };
  for (const area of [
    "inventory",
    "recognition",
    "teamLeadership",
    "onboarding",
    "certifications",
  ] as const) {
    assert.deepEqual(
      pageVersion(area, samePermissions, 1),
      pageVersion(area, samePermissions, 4),
    );
  }

  const inventory = pageVersion("inventory", samePermissions, 9) as ActionPageVersion;
  assert.equal(inventory.read, true);
  assert.equal(inventory.create, true);
  assert.equal(inventory.edit, false);
  assert.equal(inventory.delete, false);

  const recognition = pageVersion("recognition", samePermissions, 1) as ActionPageVersion;
  assert.equal(recognition.create, false);
  assert.equal(recognition.edit, true);
  assert.equal(recognition.delete, false);

  const leadership = pageVersion("teamLeadership", samePermissions, 2) as ActionPageVersion;
  assert.equal(leadership.read, true);
  assert.equal(leadership.create, false);
  assert.equal(leadership.edit, false);
  assert.equal(leadership.delete, false);

  const onboarding = pageVersion("onboarding", samePermissions, 3) as ActionPageVersion;
  assert.equal(onboarding.create, true);
  assert.equal(onboarding.edit, false);
  assert.equal(onboarding.delete, false);

  const certifications = pageVersion("certifications", samePermissions, 4) as ActionPageVersion;
  assert.deepEqual(certifications, {
    read: false,
    create: false,
    edit: false,
    delete: false,
  });
}
