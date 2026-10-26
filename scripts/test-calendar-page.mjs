import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: { "@": path.join(rootDir, "..", "src") },
});

const { runCalendarBoardTests } = importTs(
  "../src/features/calendar/utils/calendarBoard.test.ts",
);

runCalendarBoardTests();
console.log("calendar page tests passed");
