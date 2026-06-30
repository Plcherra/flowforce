import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SAFE_RENAMES = new Map([
  ["_Bell", "Bell"],
  ["_category", "category"],
  ["_redirectTo", "redirectTo"],
  ["_can", "can"],
  ["_resetPassword", "resetPassword"],
  ["_safeArrayMap", "safeArrayMap"],
  ["_safeArrayLength", "safeArrayLength"],
  ["_formId", "formId"],
  ["_startOfIsoWeek", "startOfIsoWeek"],
  ["_profile", "profile"],
  ["_Palette", "Palette"],
  ["_Share", "Share"],
  ["_Eye", "Eye"],
  ["_label", "label"],
  ["_description", "description"],
  ["_Plus", "Plus"],
  ["_Upload", "Upload"],
  ["_Heart", "Heart"],
  ["_ThumbsUp", "ThumbsUp"],
  ["_FormFieldDataLocal", "FormFieldDataLocal"],
  ["_DETAIL_TYPES", "DETAIL_TYPES"],
  ["_LocationData", "LocationData"],
  ["_SignatureData", "SignatureData"],
  ["_parseRecognitionDetailsValue", "parseRecognitionDetailsValue"],
  ["_createTicket", "createTicket"],
  ["_CardDescription", "CardDescription"],
  ["_CardHeader", "CardHeader"],
  ["_CardTitle", "CardTitle"],
  ["_CardContent", "CardContent"],
  ["_Edit", "Edit"],
  ["_ResizablePanelGroup", "ResizablePanelGroup"],
  ["_ResizablePanel", "ResizablePanel"],
  ["_ResizableHandle", "ResizableHandle"],
  ["_Filter", "Filter"],
  ["_Calculator", "Calculator"],
  ["_convertBetweenUnits", "convertBetweenUnits"],
  ["_countId", "countId"],
  ["_onCountUpdate", "onCountUpdate"],
  ["_purchaseOrders", "purchaseOrders"],
  ["_outstandingByPo", "outstandingByPo"],
  ["_listInventoryCountEvents", "listInventoryCountEvents"],
  ["_toast", "toast"],
  ["_itemsLoading", "itemsLoading"],
  ["_InventoryTransferItem", "InventoryTransferItem"],
  ["_addMinutes", "addMinutes"],
  ["_Users", "Users"],
  ["_DialogHeader", "DialogHeader"],
  ["_DialogTitle", "DialogTitle"],
  ["_DialogFooter", "DialogFooter"],
  ["_Camera", "Camera"],
  ["_user", "user"],
  ["_Layout", "Layout"],
  ["_Settings", "Settings"],
  ["_CustomRole", "CustomRole"],
  ["_isLastStep", "isLastStep"],
  ["_RouteGuard", "RouteGuard"],
  ["_canAny", "canAny"],
  ["_permissions", "permissions"],
  ["_AlertTriangle", "AlertTriangle"],
  ["_Calendar", "Calendar"],
  ["_currentView", "currentView"],
  ["_CoverageGap", "CoverageGap"],
  ["_CoverageTemplatePlan", "CoverageTemplatePlan"],
  ["_DraftShift", "DraftShift"],
  ["_SchedulerEmployee", "SchedulerEmployee"],
  ["_ScheduleSummary", "ScheduleSummary"],
  ["_SwapSuggestion", "SwapSuggestion"],
  ["_companyId", "companyId"],
  ["_loading", "loading"],
  ["_DEFAULT_ADMIN_CONFIG", "DEFAULT_ADMIN_CONFIG"],
  ["_DEFAULT_APPEARANCE", "DEFAULT_APPEARANCE"],
  ["_DEFAULT_GENERAL", "DEFAULT_GENERAL"],
  ["_DEFAULT_INTEGRATIONS", "DEFAULT_INTEGRATIONS"],
  ["_DEFAULT_LOCALIZATION", "DEFAULT_LOCALIZATION"],
  ["_DEFAULT_NOTIFICATIONS", "DEFAULT_NOTIFICATIONS"],
  ["_DEFAULT_SECURITY", "DEFAULT_SECURITY"],
  ["_Volume2", "Volume2"],
  ["_format", "format"],
  ["_deleteNotification", "deleteNotification"],
  ["_TaskCommentWithUser", "TaskCommentWithUser"],
  ["_userId", "userId"],
  ["_isSameDay", "isSameDay"],
  ["_setQuery", "setQuery"],
  ["_hoursSoFar", "hoursSoFar"],
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "dist"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(tsx?)$/.test(entry)) files.push(path);
  }
  return files;
}

let touched = 0;
for (const root of ["src", "app", "tests"]) {
  for (const file of walk(root)) {
    let source = readFileSync(file, "utf8");
    let next = source;
    for (const [from, to] of SAFE_RENAMES) {
      next = next.replaceAll(from, to);
    }
    if (next !== source) {
      writeFileSync(file, next, "utf8");
      touched++;
    }
  }
}

console.log(`Fixed ${touched} files`);
