import assert from "node:assert/strict";
import {
  OPERATOR_AREAS,
  applyOperatorVerbsToPermissions,
  defaultOperatorVerbSelection,
  getOperatorAreaDefinition,
  getVisibleOperatorAreas,
  isOperatorAreaVisibleAtLevel,
  isVerbAvailable,
  isVerbEnabled,
  permissionsToOperatorVerbs,
  unclassifiedPermissionKeys,
} from "./operatorBoxes";

export function runOperatorBoxTests() {
  assert.equal(unclassifiedPermissionKeys().length, 0, "every registry key is classified");
  assert.deepEqual(
    OPERATOR_AREAS.map((area) => area.key),
    [
      "profile",
      "my_schedule",
      "team_schedule",
      "my_tasks",
      "run_lists",
      "expenses",
      "time_off",
      "inventory",
      "reports",
      "ai",
      "team",
      "settings",
    ],
  );

  const staffVisible = getVisibleOperatorAreas("staff").map((area) => area.key);
  assert.equal(staffVisible.includes("inventory"), true);
  assert.equal(staffVisible.includes("settings"), true);
  assert.equal(staffVisible.includes("ai"), true);

  const teamSchedule = getOperatorAreaDefinition("team_schedule");
  assert.ok(teamSchedule);
  assert.equal(isVerbAvailable(teamSchedule, "see", "staff"), true);
  assert.equal(isVerbAvailable(teamSchedule, "edit", "staff"), true);
  assert.equal(isVerbAvailable(teamSchedule, "create_delete", "staff"), false);

  const inventory = getOperatorAreaDefinition("inventory");
  assert.ok(inventory);
  assert.equal(isVerbAvailable(inventory, "see", "staff"), false);

  const staffDefault = defaultOperatorVerbSelection("staff");
  assert.deepEqual(staffDefault, [
    "profile:see",
    "profile:edit",
    "my_schedule:see",
    "my_tasks:see",
    "expenses:see",
  ]);

  const staffWithSchedule = applyOperatorVerbsToPermissions("staff", [
    "profile:see",
    "profile:edit",
    "my_schedule:see",
    "my_tasks:see",
    "expenses:see",
    "team_schedule:see",
    "team:see",
  ]);
  assert.equal(staffWithSchedule.viewTeamSchedules, true);
  assert.equal(staffWithSchedule["schedule.view"], true);
  assert.equal(staffWithSchedule["directory.view"], true);
  assert.equal(staffWithSchedule.editSchedules, false);
  assert.equal(staffWithSchedule["billing.manage"], undefined);
  assert.deepEqual(permissionsToOperatorVerbs("staff", staffWithSchedule), [
    "profile:see",
    "profile:edit",
    "my_schedule:see",
    "team_schedule:see",
    "my_tasks:see",
    "expenses:see",
    "team:see",
  ]);

  const staffRunLists = applyOperatorVerbsToPermissions("staff", [
    "profile:see",
    "profile:edit",
    "my_schedule:see",
    "my_tasks:see",
    "expenses:see",
    "run_lists:see",
  ]);
  assert.equal(staffRunLists.viewTeamTasks, true);
  assert.equal(staffRunLists.editTasks, undefined);

  const settings = getOperatorAreaDefinition("settings");
  assert.ok(settings);
  assert.equal(isOperatorAreaVisibleAtLevel(settings, "staff"), true);
  assert.equal(isVerbAvailable(settings, "see", "staff"), false);
  assert.equal(isVerbAvailable(settings, "see", "manager"), false);
  assert.equal(isVerbAvailable(settings, "see", "admin"), true);

  const managerDefault = defaultOperatorVerbSelection("manager");
  assert.equal(managerDefault.includes("team_schedule:see"), true);
  assert.equal(managerDefault.includes("team_schedule:edit"), true);
  assert.equal(managerDefault.includes("inventory:see"), true);
  assert.equal(managerDefault.includes("time_off:edit"), true);
  assert.equal(managerDefault.includes("reports:see"), true);
  assert.equal(managerDefault.includes("expenses:see"), true);
  assert.equal(managerDefault.includes("ai:see"), true);
  assert.equal(managerDefault.includes("settings:see"), false);
  assert.equal(managerDefault.includes("team:edit"), true);

  const ownerAccess = applyOperatorVerbsToPermissions("owner", ["my_schedule:see"]);
  assert.equal(ownerAccess.systemSettings, true);
  assert.equal(ownerAccess["billing.manage"], true);
  assert.equal(ownerAccess.manageUsers, true);
  assert.equal(isVerbEnabled(settings, "see", "owner", ownerAccess), true);
  assert.equal(
    permissionsToOperatorVerbs("owner", ownerAccess).includes("settings:edit"),
    true,
  );
  assert.equal(
    permissionsToOperatorVerbs("owner", ownerAccess).includes("team:create_delete"),
    true,
  );

  const teamSeeKeys = teamSchedule.verbs.see;
  assert.ok(teamSeeKeys.length > 1);
  const partialTeamSee = Object.fromEntries(
    teamSeeKeys.map((key, index) => [key, index === 0]),
  );
  assert.equal(
    isVerbEnabled(teamSchedule, "see", "manager", partialTeamSee),
    false,
    "a job box is on only when every grantable key is held",
  );
}
