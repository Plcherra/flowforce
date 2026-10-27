import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  jsx: true,
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runStatusTabLayoutTests } = importTs(
  "../src/features/tasks/utils/statusTabLayout.test.ts",
);
const { runStatusHintTests } = importTs(
  "../src/features/tasks/utils/statusHint.test.ts",
);
const { runReadinessFilterTests } = importTs(
  "../src/features/tasks/utils/readinessFilters.test.ts",
);
const { runTaskKindTests } = importTs(
  "../src/features/tasks/utils/taskKind.test.ts",
);
const { runTaskCreateLevelTests } = importTs(
  "../src/features/tasks/utils/taskCreateLevel.test.ts",
);
const { runHandoverTaskTests } = importTs(
  "../src/features/forms/utils/handoverTask.test.ts",
);
const { runTaskScheduleTests } = importTs(
  "../src/features/tasks/utils/taskSchedule.test.ts",
);
const { runTomorrowShiftTests } = importTs(
  "../src/features/scheduling/utils/tomorrowShift.test.ts",
);
const { runTaskCreateAccessTests } = importTs(
  "../src/features/tasks/utils/taskCreateAccess.test.ts",
);
const { runExecutionUpdateTests } = importTs(
  "../src/features/tasks/utils/executionUpdate.test.ts",
);
const { runListIssueTests } = importTs(
  "../src/features/tasks/utils/listIssues.test.ts",
);
const { runTaskPointsTotalTests } = importTs(
  "../src/features/performance/utils/taskPointsTotal.test.ts",
);
const { runListIssueInsertTests } = importTs(
  "../src/features/tasks/utils/listIssueInsert.test.ts",
);
const { runListIssueGatherTests } = importTs(
  "../src/features/tasks/utils/listIssueGather.test.ts",
);
const { runChecklistFormTests } = importTs(
  "../src/features/forms/utils/checklistForms.test.ts",
);
const { runShiftChecklistListTests } = importTs(
  "../src/features/forms/utils/shiftChecklistLists.test.ts",
);
const { runShiftWeekdayTaskTests } = importTs(
  "../src/features/tasks/utils/shiftWeekdayTask.test.ts",
);
const { runClosingNoteTests } = importTs(
  "../src/features/forms/utils/closingNotes.test.ts",
);
const { runClosingNoteDraftTests } = importTs(
  "../src/features/tasks/utils/closingNoteDrafts.test.ts",
);
const { runMyShiftViewTests } = importTs(
  "../src/features/tasks/utils/myShiftView.test.ts",
);
const { runChecklistProgressTests } = importTs(
  "../src/features/tasks/utils/checklistProgress.test.ts",
);
const { runAssignChecklistFormTests } = importTs(
  "../src/features/forms/utils/assignChecklistForm.test.ts",
);
const { runWeekdayTaskDraftTests } = importTs(
  "../src/features/tasks/utils/weekdayTaskDraft.test.ts",
);
const { runDraftInboxTests } = importTs(
  "../src/features/tasks/utils/draftInbox.test.ts",
);
const { runTaskAssigneeScopeTests } = importTs(
  "../src/features/tasks/utils/taskAssigneeScope.test.ts",
);
const { runTaskAudienceTests } = importTs(
  "../src/features/tasks/utils/taskAudience.test.ts",
);
const { runTaskCreateGrantStoreTests } = importTs(
  "../src/features/roles/constants/taskCreateGrantStore.test.ts",
);
const { runMyShiftReloadTests } = importTs(
  "../src/features/tasks/utils/myShiftReload.test.ts",
);
const { runFormShiftLinkTests } = importTs(
  "../src/features/forms/utils/formShiftLink.test.ts",
);
const { runTodayShiftMonitorTests } = importTs(
  "../src/features/tasks/utils/todayShiftMonitor.test.ts",
);
const { runShiftLinkedFormsTests } = importTs(
  "../src/features/scheduling/utils/shiftLinkedForms.test.ts",
);
const { runFormsSurfaceTests } = importTs(
  "../src/features/forms/utils/formsSurface.test.ts",
);
const { runCsvFormFieldsTests } = importTs(
  "../src/features/forms/utils/csvFormFields.test.ts",
);
const { runShiftTaskWriteTests } = importTs(
  "../src/features/tasks/utils/shiftTaskWrite.test.ts",
);
const { runPeoplePickerFilterTests } = importTs(
  "../src/components/people/peoplePickerFilter.test.ts",
);
const { runFormLifecycleTests } = importTs(
  "../src/features/forms/utils/formLifecycle.test.ts",
);
const { runFormFieldRowTests } = importTs(
  "../src/features/forms/utils/formFieldRows.test.ts",
);
const { runFormTemplateTests } = importTs(
  "../src/features/forms/utils/formTemplates.test.ts",
);

runStatusTabLayoutTests();
runStatusHintTests();
runReadinessFilterTests();
runTaskKindTests();
runTaskCreateLevelTests();
runHandoverTaskTests();
runTaskScheduleTests();
runTomorrowShiftTests();
runTaskCreateAccessTests();
runExecutionUpdateTests();
runListIssueTests();
runTaskPointsTotalTests();
runListIssueInsertTests();
runListIssueGatherTests();
runChecklistFormTests();
runShiftChecklistListTests();
runShiftWeekdayTaskTests();
runClosingNoteTests();
await runClosingNoteDraftTests();
runMyShiftViewTests();
runChecklistProgressTests();
runAssignChecklistFormTests();
runWeekdayTaskDraftTests();
runDraftInboxTests();
runTaskAssigneeScopeTests();
runTaskAudienceTests();
runTaskCreateGrantStoreTests();
runMyShiftReloadTests();
runFormShiftLinkTests();
runTodayShiftMonitorTests();
runShiftLinkedFormsTests();
runFormsSurfaceTests();
runCsvFormFieldsTests();
runShiftTaskWriteTests();
runPeoplePickerFilterTests();
runFormLifecycleTests();
runFormFieldRowTests();
runFormTemplateTests();
console.log("tasks page tests passed");
