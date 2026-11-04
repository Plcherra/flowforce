import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runMoveShiftTests } = importTs(
  "../src/features/scheduling/services/moveShift.test.ts",
);
const { runPlaceDayEventsTests } = importTs(
  "../src/features/scheduling/services/placeDayEvents.test.ts",
);
const { runShiftChipPaintTests } = importTs(
  "../src/features/scheduling/utils/shiftChipPaint.test.ts",
);
const { runCalendarEventHrefTests } = importTs(
  "../src/features/scheduling/utils/calendarEventHref.test.ts",
);
const { runShiftLaunchTests } = importTs(
  "../src/features/scheduling/utils/shiftLaunch.test.ts",
);

await runMoveShiftTests();
runPlaceDayEventsTests();
runShiftChipPaintTests();
runCalendarEventHrefTests();
runShiftLaunchTests();
console.log("moveShift tests passed");
