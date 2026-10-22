import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runProductRolesSetupTests } = importTs(
  "../app/api/_server/productRolesSetup.test.ts",
);
const { runProductLevelTests } = importTs(
  "../src/features/roles/constants/productLevels.test.ts",
);
const { runOperatorBoxTests } = importTs(
  "../src/features/roles/constants/operatorBoxes.test.ts",
);
const { runPersonAccessDiffTests } = importTs(
  "../src/features/roles/constants/personAccessDiffs.test.ts",
);
const { runGrantCeilingTests } = importTs(
  "../src/features/roles/constants/grantCeiling.test.ts",
);
const { runStaffInviteScheduleDefaultTests } = importTs(
  "../src/features/employees/utils/staffInviteScheduleDefaults.test.ts",
);
const { runPermissionAccessTypeTests } = importTs(
  "../src/features/roles/constants/permissionAccessTypes.test.ts",
);
const { runSettingsTabTests } = importTs(
  "../src/features/system/utils/settingsTabs.test.ts",
);
const { runPermissionGrantTests } = importTs(
  "../src/features/roles/constants/permissionGrant.test.ts",
);

await runProductRolesSetupTests();
runProductLevelTests();
runOperatorBoxTests();
runPersonAccessDiffTests();
runGrantCeilingTests();
runStaffInviteScheduleDefaultTests();
runPermissionAccessTypeTests();
runSettingsTabTests();
runPermissionGrantTests();
console.log("productRolesSetup tests passed");
console.log("productLevels tests passed");
console.log("operatorBoxes tests passed");
console.log("personAccessDiffs tests passed");
console.log("grantCeiling tests passed");
console.log("staffInviteScheduleDefaults tests passed");
console.log("permissionAccessTypes tests passed");
console.log("settingsTabs tests passed");
console.log("permissionGrant tests passed");
