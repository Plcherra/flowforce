import assert from "node:assert/strict";
import {
  DEFAULT_PACK_FLAGS,
  applyPackFlagOverride,
  isPackEnabled,
  packRequiredForPath,
  parsePackFlagOverrides,
  readPackFlagsFromAdminConfig,
} from "./packFlags";

export function runPackFlagTests() {
  assert.equal(isPackEnabled(DEFAULT_PACK_FLAGS, "ops"), true);
  assert.equal(isPackEnabled(DEFAULT_PACK_FLAGS, "team"), false);
  assert.equal(isPackEnabled(DEFAULT_PACK_FLAGS, "insights"), false);
  assert.equal(isPackEnabled(DEFAULT_PACK_FLAGS, "stock"), false);

  const fromCompany = readPackFlagsFromAdminConfig({
    tenantManagement: { plan: "starter" },
    packFlags: { team: true, insights: false, stock: true, ops: false },
  });
  assert.deepEqual(fromCompany, {
    ops: true,
    team: true,
    insights: false,
    stock: true,
  });

  assert.equal(readPackFlagsFromAdminConfig({}).stock, false);
  assert.equal(readPackFlagsFromAdminConfig(null).team, false);
  assert.equal(parsePackFlagOverrides({ team: "yes" }), null);

  const overridden = applyPackFlagOverride(fromCompany, {
    team: false,
    insights: true,
    stock: false,
  });
  assert.deepEqual(overridden, {
    ops: true,
    team: false,
    insights: true,
    stock: false,
  });

  assert.equal(packRequiredForPath("/employees"), null);
  assert.equal(packRequiredForPath("/app/employees"), null);
  assert.equal(packRequiredForPath("/employee-directory"), null);
  assert.equal(packRequiredForPath("/app/tasks"), null);
  assert.equal(packRequiredForPath("/app/enhanced-scheduling"), null);
  assert.equal(packRequiredForPath("/app/forms"), null);
  assert.equal(packRequiredForPath("/app/messages"), null);
  assert.equal(packRequiredForPath("/app/dashboard"), null);
  assert.equal(packRequiredForPath("/invite-employee"), null);

  assert.equal(packRequiredForPath("/inventory"), "stock");
  assert.equal(packRequiredForPath("/app/inventory/counts/abc"), "stock");
  assert.equal(packRequiredForPath("/app/expenses"), "stock");
  assert.equal(packRequiredForPath("/cookbook"), "stock");
  assert.equal(packRequiredForPath("/app/purchasing"), "stock");

  assert.equal(packRequiredForPath("/reports"), "insights");
  assert.equal(packRequiredForPath("/app/analytics"), "insights");
  assert.equal(packRequiredForPath("/app/ai-insights"), "insights");
  assert.equal(packRequiredForPath("/operations"), "insights");

  assert.equal(packRequiredForPath("/performance"), "team");
  assert.equal(packRequiredForPath("/app/recognition"), "team");
  assert.equal(packRequiredForPath("/app/leaderboard"), "team");
  assert.equal(packRequiredForPath("/app/learning-center"), "team");
  assert.equal(packRequiredForPath("/app/certifications"), "team");
  assert.equal(packRequiredForPath("/app/resources/docs"), "team");
}
