import assert from "node:assert/strict";
import {
  canInviteProductLevel,
  clampPermissionDiffsToInviter,
  inviterCanGrantVerb,
  maxInvitableProductLevel,
  parseInviteGrantPolicy,
  resolveInviterLevel,
} from "./grantCeiling";
import { getOperatorAreaDefinition } from "./operatorBoxes";
import { allowKeysToClearOnClassSave } from "./personAccessDiffs";
import { getProductRolePermissions } from "./productRoles";

export function runGrantCeilingTests() {
  assert.equal(resolveInviterLevel({ role: "company_admin" }), "admin");
  assert.equal(resolveInviterLevel({ role: "employee" }), "staff");
  assert.equal(resolveInviterLevel({ product_level: "manager" }), "manager");
  assert.equal(
    resolveInviterLevel({ product_level: "manager", role: "staff" }),
    "manager",
  );
  assert.equal(parseInviteGrantPolicy(null).managerCanInviteManagers, true);
  assert.equal(
    parseInviteGrantPolicy({
      access: { managerCanInviteManagers: false },
    }).managerCanInviteManagers,
    false,
  );

  assert.equal(maxInvitableProductLevel("owner"), "admin");
  assert.equal(maxInvitableProductLevel("admin"), "admin");
  assert.equal(maxInvitableProductLevel("manager"), "manager");
  assert.equal(
    maxInvitableProductLevel("manager", { managerCanInviteManagers: false }),
    "staff",
  );
  assert.equal(maxInvitableProductLevel("staff"), null);

  assert.equal(canInviteProductLevel("owner", "admin"), true);
  assert.equal(canInviteProductLevel("owner", "manager"), true);
  assert.equal(canInviteProductLevel("owner", "staff"), true);
  assert.equal(canInviteProductLevel("owner", "owner"), false);

  assert.equal(canInviteProductLevel("admin", "admin"), true);
  assert.equal(canInviteProductLevel("admin", "staff"), true);
  assert.equal(canInviteProductLevel("admin", "owner"), false);

  assert.equal(canInviteProductLevel("manager", "staff"), true);
  assert.equal(canInviteProductLevel("manager", "manager"), true);
  assert.equal(
    canInviteProductLevel("manager", "manager", {
      managerCanInviteManagers: false,
    }),
    false,
  );
  assert.equal(canInviteProductLevel("manager", "admin"), false);
  assert.equal(canInviteProductLevel("staff", "staff"), false);

  const manager = getProductRolePermissions("manager");
  const teamSchedule = getOperatorAreaDefinition("team_schedule");
  const settings = getOperatorAreaDefinition("settings");
  assert.ok(teamSchedule);
  assert.ok(settings);

  assert.equal(
    inviterCanGrantVerb(teamSchedule, "see", "staff", "manager", manager),
    true,
    "Owner lets a Manager grant Staff-level team schedule See",
  );
  assert.equal(
    inviterCanGrantVerb(teamSchedule, "edit", "staff", "manager", manager),
    true,
    "A manager can turn draft and create-shift on for a staff invite",
  );
  assert.equal(
    inviterCanGrantVerb(settings, "see", "staff", "manager", manager),
    false,
    "Manager cannot grant Settings on Staff",
  );
  assert.equal(
    inviterCanGrantVerb(settings, "see", "admin", "manager", manager),
    false,
  );

  const managerWithoutTeam = {
    ...manager,
    viewTeamSchedules: false,
    "schedule.view": false,
  };
  assert.equal(
    inviterCanGrantVerb(
      teamSchedule,
      "see",
      "staff",
      "manager",
      managerWithoutTeam,
    ),
    false,
    "Inviter cannot grant a box they do not hold",
  );

  const granted = clampPermissionDiffsToInviter(
    "staff",
    {
      viewTeamSchedules: "allow",
      "schedule.view": "allow",
      "billing.manage": "allow",
      approveTimeOff: "deny",
    },
    "manager",
    manager,
  );
  assert.equal(granted.viewTeamSchedules, "allow");
  assert.equal(granted["schedule.view"], "allow");
  assert.equal(granted["billing.manage"], undefined);
  assert.equal(granted.approveTimeOff, undefined);

  const blockedGive = clampPermissionDiffsToInviter(
    "staff",
    { viewTeamSchedules: "allow", "schedule.view": "allow" },
    "manager",
    managerWithoutTeam,
  );
  assert.equal(blockedGive.viewTeamSchedules, undefined);

  const ownerClamp = clampPermissionDiffsToInviter(
    "manager",
    { approveTimeOff: "deny" },
    "owner",
    {},
  );
  assert.equal(ownerClamp.approveTimeOff, "deny");

  assert.deepEqual(
    allowKeysToClearOnClassSave(
      { viewTeamSchedules: true, approveTimeOff: true },
      { viewTeamSchedules: false, approveTimeOff: true },
    ).sort(),
    ["approveTimeOff", "viewTeamSchedules"],
  );
}
