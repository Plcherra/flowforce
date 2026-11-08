import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runInviteLocationTests } = importTs(
  "../src/features/employees/utils/inviteLocation.test.ts",
);
const { runInviteDepartmentTests } = importTs(
  "../src/features/employees/utils/inviteDepartment.test.ts",
);
const { runInviteRoleChoiceTests } = importTs(
  "../src/features/employees/utils/inviteRoleChoices.test.ts",
);

runInviteLocationTests();
runInviteDepartmentTests();
runInviteRoleChoiceTests();
console.log("invite location tests passed");
