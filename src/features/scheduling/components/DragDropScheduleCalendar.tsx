import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { dateLocale } from "@/features/scheduling/utils/dateLocale";
import { DndContext } from "@dnd-kit/core";
import { AssignmentPanel } from "@/features/scheduling/components/drag-drop/AssignmentPanel";
import { ScheduleToolbar } from "@/features/scheduling/components/drag-drop/ScheduleToolbar";
import { WeekGrid } from "@/features/scheduling/components/drag-drop/WeekGrid";
import {
  MobileWeekBoard,
  usePhoneScheduleLayout,
} from "@/features/scheduling/components/drag-drop/MobileWeekBoard";
import { ShiftDetailsPanel } from "@/features/scheduling/components/ShiftDetailsPanel";
import {
  ShiftWizardDialog,
  type ShiftWizardTemplateSeed,
} from "@/features/scheduling/components/ShiftWizardDialog";
import { WeekTemplateDialog } from "@/features/scheduling/components/WeekTemplateDialog";
import { ImportShiftsDialog } from "@/features/scheduling/components/ImportShiftsDialog";
import { ScheduleEmptyState } from "@/features/scheduling/components/ScheduleEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduleBoard } from "@/features/scheduling/hooks/useScheduleBoard";
import type { PendingVendorEvent, ShiftTemplate } from "./drag-drop/types";
import {
  ROLE_TEMPLATES,
} from "@/features/scheduling/constants/templates";
import type { VendorPaletteItem } from "@/features/scheduling/components/drag-drop/types";
import { useDragDropHandlers } from "@/features/scheduling/hooks/useDragDropHandlers";
import { useShiftDragDrop } from "@/features/scheduling/hooks/useShiftDragDrop";
import { useVendorForm } from "@/features/scheduling/hooks/useVendorForm";
import {
  AddUnavailabilityDialog,
  AddTimeOffDialog,
  VendorEventDialog,
} from "./dialogs";

interface DragDropScheduleCalendarProps {
  selectedDate: Date;
  locationFilter?: string;
  onAutoScheduleClick?: () => void;
  autoScheduleDisabled?: boolean;
  boardLocked?: boolean;
  readOnly?: boolean;
  profileId?: string | null;
  onOpenPanel?: (panel: import("../types/panels").SchedulingPanelId) => void;
  onSuggestFills?: () => void;
  smartFillOpen?: boolean;
  onToggleSmartFill?: () => void;
}

type VendorShiftOption = {
  id?: string | null;
  title?: string | null;
  role?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

const toVendorShiftOption = (shift: unknown): VendorShiftOption => {
  if (!shift || typeof shift !== "object") return {};
  const row = shift as Record<string, unknown>;
  return {
    id: typeof row.id === "string" ? row.id : null,
    title: typeof row.title === "string" ? row.title : null,
    role: typeof row.role === "string" ? row.role : null,
    start_time: typeof row.start_time === "string" ? row.start_time : null,
    end_time: typeof row.end_time === "string" ? row.end_time : null,
  };
};

export function DragDropScheduleCalendar({
  selectedDate,
  locationFilter,
  onAutoScheduleClick,
  autoScheduleDisabled = false,
  boardLocked = false,
  readOnly = false,
  profileId = null,
  onOpenPanel,
  onSuggestFills,
  smartFillOpen = false,
  onToggleSmartFill,
}: DragDropScheduleCalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = dateLocale(i18n.resolvedLanguage || i18n.language);
  const editsLocked = readOnly || boardLocked;
  const [draggedVendor, setDraggedVendor] = useState<VendorPaletteItem | null>(
    null,
  );
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [pendingVendorEvent, setPendingVendorEvent] =
    useState<PendingVendorEvent | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<
    (typeof ROLE_TEMPLATES)[number] | null
  >(null);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [showShiftSheet, setShowShiftSheet] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWeekTemplates, setShowWeekTemplates] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const isPhone = usePhoneScheduleLayout();
  const [showImportShifts, setShowImportShifts] = useState(false);
  const [showMultiAdd, setShowMultiAdd] = useState(false);
  const [showAddUnavailability, setShowAddUnavailability] = useState(false);
  const [showAddTimeOff, setShowAddTimeOff] = useState(false);
  // Multi-add state
  const [multiTitle, setMultiTitle] = useState("Shift");
  const [multiStart, setMultiStart] = useState("09:00");
  const [multiEnd, setMultiEnd] = useState("17:00");
  const [multiDays, setMultiDays] = useState<number[]>([]);
  const [multiHeadcount, setMultiHeadcount] = useState(1);
  // Unavailability state
  const [uaUserId, setUaUserId] = useState<string>("");
  const [uaStart, setUaStart] = useState("");
  const [uaEnd, setUaEnd] = useState("");
  const [uaReason, setUaReason] = useState("");
  // Time off state
  const [toUserId, setToUserId] = useState<string>("");
  const [toType, setToType] = useState<
    "vacation" | "sick" | "personal" | "other"
  >("vacation");
  const [toStartDate, setToStartDate] = useState("");
  const [toEndDate, setToEndDate] = useState("");
  const [toReason, setToReason] = useState("");
  const [minimizedView, setMinimizedView] = useState(false);
  const [wizardSeed, setWizardSeed] = useState<ShiftWizardTemplateSeed | null>(
    null,
  );
  const [showDailyInfo, setShowDailyInfo] = useState(true);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const {
    employees,
    weekSchedules: boardWeekSchedules,
    weekDays,
    weekStart,
    locations,
    candidateVendorShifts,
    unassignedShifts: boardUnassignedShifts,
    vendorEventsByShift,
    looseVendorEventsByDay,
    cellAvailability,
    getCellAvailability,
    shiftsByEmployeeDay: boardShiftsByEmployeeDay,
    conflictByShiftId: boardConflictByShiftId,
    dailyGridStats: boardDailyGridStats,
    showAvailabilityLayer,
    setShowAvailabilityLayer,
    timeOffRequests,
    weekCsvContent,
    weekCsvFilename,
    loading,
    actions,
  } = useScheduleBoard({ selectedDate, locationFilter, pendingVendorEvent });

  const weekSchedules = useMemo(() => {
    if (!readOnly || !profileId) return boardWeekSchedules;
    return boardWeekSchedules.filter((shift) =>
      shift.assignments?.some((assignment) => assignment.user_id === profileId),
    );
  }, [boardWeekSchedules, profileId, readOnly]);

  const unassignedShifts = readOnly ? [] : boardUnassignedShifts;

  const vendorShiftOptions = useMemo(
    () => candidateVendorShifts.map(toVendorShiftOption),
    [candidateVendorShifts],
  );

  const {
    createSchedule,
    assign,
    updateSchedule,
    unassign,
    createVendorEvent,
    addUnavailability: addUnavailabilityAction,
    requestTimeOff: requestTimeOffAction,
    bulkCreateShifts: bulkCreateShiftsAction,
    refetchAll,
    copyPreviousWeek: copyPreviousWeekAction,
    clearCurrentWeek: clearCurrentWeekAction,
    publishWeekStatus: publishWeekStatusAction,
  } = actions;

  const { vendorForm, setVendorForm } = useVendorForm({
    pendingVendorEvent,
    locations,
    candidateVendorShifts: vendorShiftOptions,
    vendorModalOpen,
  });

  const {
    handleTemplateDragStart,
    handleDragOver,
    handleBoardDrop,
  } = useDragDropHandlers({
    draggedTemplate,
    draggedVendor,
    createSchedule,
    assign,
    refetchAll,
    setPendingVendorEvent,
    setVendorModalOpen,
    setDraggedTemplate,
    setDraggedVendor,
    getCellAvailability,
    locationFilter,
  });

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    dragOverlay,
  } = useShiftDragDrop({
    enabled: !editsLocked,
    updateSchedule,
    assign,
    unassign,
    refetchAll,
    getCellAvailability,
    conflictByShiftId: boardConflictByShiftId,
  });

  const openBlankShiftWizard = () => {
    setQuickAddDate(null);
    setWizardSeed(null);
    setShowAddShift(true);
  };

  const openShiftOnDay = (day: Date) => {
    setQuickAddDate(day);
    setWizardSeed(null);
    setShowAddShift(true);
  };

  const openRoleTemplateWizard = (template: ShiftTemplate) => {
    setWizardSeed({
      title: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      role: template.role,
      color: template.color,
    });
    setShowAddShift(true);
  };

  const openShiftDetails = (scheduleId: string) => {
    setSelectedShift(scheduleId);
    setShowShiftSheet(true);
  };

  const exportWeekCsv = useCallback(() => {
    if (!weekCsvContent) return;
    const blob = new Blob([weekCsvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = weekCsvFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [weekCsvContent, weekCsvFilename]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const isWeekEmpty = weekSchedules.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {!readOnly && (
          <AssignmentPanel
            showTemplates={showTemplates}
            templates={ROLE_TEMPLATES}
            onTemplateDragStart={handleTemplateDragStart}
            onTemplateClick={openRoleTemplateWizard}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ScheduleToolbar
            weekSchedules={weekSchedules}
            minimizedView={minimizedView}
            showDailyInfo={showDailyInfo}
            onToggleTemplates={() => setShowTemplates((value) => !value)}
            onOpenWeekTemplates={() => setShowWeekTemplates(true)}
            onCopyPreviousWeek={copyPreviousWeekAction}
            onAutoScheduleWeek={onAutoScheduleClick}
            autoScheduleDisabled={autoScheduleDisabled}
            onClearWeek={clearCurrentWeekAction}
            onPublishWeek={publishWeekStatusAction}
            onExportWeekCsv={exportWeekCsv}
            onOpenAddShift={openBlankShiftWizard}
            onOpenMultiAdd={() => setShowMultiAdd(true)}
            onOpenImportShifts={() => setShowImportShifts(true)}
            onOpenAddUnavailability={() => setShowAddUnavailability(true)}
            onOpenAddTimeOff={() => setShowAddTimeOff(true)}
            onPrintWeek={() => window.print()}
            setMinimizedView={setMinimizedView}
            setShowDailyInfo={setShowDailyInfo}
            showAvailabilityLayer={showAvailabilityLayer}
            setShowAvailabilityLayer={setShowAvailabilityLayer}
            readOnly={editsLocked}
            onOpenTimeOffPanel={
              readOnly && onOpenPanel ? () => onOpenPanel("timeoff") : undefined
            }
            smartFillOpen={smartFillOpen}
            onToggleSmartFill={onToggleSmartFill}
          />

          {isWeekEmpty ? (
            <ScheduleEmptyState
              variant="banner"
              view="week"
              hasLocationFilter={Boolean(locationFilter)}
              readOnly={readOnly}
              unavailable={boardLocked}
              onSuggestFills={editsLocked ? undefined : onSuggestFills}
              onOpenAvailability={
                onOpenPanel ? () => onOpenPanel("availability") : undefined
              }
            />
          ) : null}

          <div
            ref={gridScrollRef}
            data-testid="schedule-grid-scroll"
            className="min-h-0 flex-1 overflow-auto"
          >
            {isPhone ? (
              <MobileWeekBoard
                weekDays={weekDays}
                shifts={weekSchedules}
                conflictByShiftId={boardConflictByShiftId}
                onShiftClick={openShiftDetails}
                onAddShift={editsLocked ? undefined : openShiftOnDay}
              />
            ) : (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
              <WeekGrid
                weekDays={weekDays}
                employees={
                  readOnly && profileId
                    ? employees.filter((e) => e.id === profileId)
                    : employees
                }
                unassignedShifts={unassignedShifts}
                vendorEventsByShift={readOnly ? new Map() : vendorEventsByShift}
                looseVendorEventsByDay={
                  readOnly ? new Map() : looseVendorEventsByDay
                }
                cellAvailability={cellAvailability}
                shiftsByEmployeeDay={boardShiftsByEmployeeDay}
                conflictByShiftId={boardConflictByShiftId}
                dailyGridStats={boardDailyGridStats}
                showAvailabilityLayer={showAvailabilityLayer}
                showGridFooter={showDailyInfo}
                enableShiftDrag={!editsLocked}
                scrollContainerRef={gridScrollRef}
                onShiftClick={openShiftDetails}
                onDrop={editsLocked ? undefined : handleBoardDrop}
                onDragOver={editsLocked ? undefined : handleDragOver}
                minimizedView={minimizedView}
                timeOffRequests={timeOffRequests}
              />
              {dragOverlay}
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Week Template Dialog */}
      <WeekTemplateDialog
        open={showWeekTemplates}
        onOpenChange={setShowWeekTemplates}
        selectedDate={selectedDate}
        weekSchedules={boardWeekSchedules}
        weekStart={weekStart}
        bulkCreateShifts={bulkCreateShiftsAction}
        assign={assign}
        refetchAll={refetchAll}
        clearWeek={clearCurrentWeekAction}
        onApplied={refetchAll}
      />

      {/* Shift Details Sheet */}
      {selectedShift && (
        <Sheet open={showShiftSheet} onOpenChange={setShowShiftSheet}>
          <SheetContent
            side="right"
            hideClose
            className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl"
          >
            <ShiftDetailsPanel
              shiftId={selectedShift}
              onClose={() => setShowShiftSheet(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Add Shift Dialog */}
      <ShiftWizardDialog
        open={showAddShift}
        onOpenChange={(open) => {
          setShowAddShift(open);
          if (!open) setQuickAddDate(null);
        }}
        selectedDate={quickAddDate || selectedDate}
        templateSeed={wizardSeed}
      />

      {/* Import Shifts Dialog */}
      <ImportShiftsDialog
        open={showImportShifts}
        onOpenChange={setShowImportShifts}
      />

      {/* Add Multiple Shifts Dialog */}
      <Dialog open={showMultiAdd} onOpenChange={setShowMultiAdd}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t("schedule.addMultipleShifts")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="mtitle">{t("schedule.title")}</Label>
              <Input
                id="mtitle"
                value={multiTitle}
                onChange={(e) => setMultiTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("schedule.start")}</Label>
                <Input
                  type="time"
                  value={multiStart}
                  onChange={(e) => setMultiStart(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("schedule.end")}</Label>
                <Input
                  type="time"
                  value={multiEnd}
                  onChange={(e) => setMultiEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>{t("schedule.daysOfThisWeek")}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {weekDays.map((d, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    size="sm"
                    variant={multiDays.includes(idx) ? "default" : "outline"}
                    onClick={() =>
                      setMultiDays((prev) =>
                        prev.includes(idx)
                          ? prev.filter((i) => i !== idx)
                          : [...prev, idx],
                      )
                    }
                  >
                    {format(d, "EEE", { locale })}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("schedule.requiredHeadcount")}</Label>
              <Input
                type="number"
                min={1}
                value={multiHeadcount}
                onChange={(e) =>
                  setMultiHeadcount(parseInt(e.target.value) || 1)
                }
                className="w-32"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowMultiAdd(false)}>
                {t("schedule.cancel")}
              </Button>
              <Button
                onClick={async () => {
                  const startParts = multiStart.split(":");
                  const endParts = multiEnd.split(":");
                  const payloads = multiDays.map((index) => {
                    const day = weekDays[index];
                    const start = new Date(day);
                    start.setHours(
                      Number.parseInt(startParts[0] ?? "9", 10),
                      Number.parseInt(startParts[1] ?? "0", 10),
                      0,
                      0,
                    );
                    const end = new Date(day);
                    end.setHours(
                      Number.parseInt(endParts[0] ?? "17", 10),
                      Number.parseInt(endParts[1] ?? "0", 10),
                      0,
                      0,
                    );
                    return {
                      title: multiTitle,
                      role: "Staff",
                      color: "#3b82f6",
                      start_time: start.toISOString(),
                      end_time: end.toISOString(),
                      location: locationFilter ?? "",
                      is_all_day: false,
                      timezone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone ||
                        "UTC",
                      required_headcount: multiHeadcount,
                      notes: null,
                      break_minutes: 30,
                      hourly_rate: null,
                      is_published: false,
                      is_template: false,
                      template_id: null,
                      position_id: null,
                      status: "scheduled",
                      user_id: null,
                      requirements: [],
                    } satisfies Parameters<typeof createSchedule>[0];
                  });

                  const success = await bulkCreateShiftsAction(payloads);
                  if (success) {
                    setShowMultiAdd(false);
                    setMultiDays([]);
                  }
                }}
                disabled={multiDays.length === 0}
              >
                {t("schedule.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Unavailability */}
      <AddUnavailabilityDialog
        open={showAddUnavailability}
        onOpenChange={setShowAddUnavailability}
        employees={employees}
        userId={uaUserId}
        start={uaStart}
        end={uaEnd}
        reason={uaReason}
        onUserIdChange={setUaUserId}
        onStartChange={setUaStart}
        onEndChange={setUaEnd}
        onReasonChange={setUaReason}
        onSubmit={addUnavailabilityAction}
      />

      {/* Add Time Off */}
      <AddTimeOffDialog
        open={showAddTimeOff}
        onOpenChange={setShowAddTimeOff}
        employees={employees}
        userId={toUserId}
        startDate={toStartDate}
        endDate={toEndDate}
        type={toType}
        reason={toReason}
        onUserIdChange={setToUserId}
        onStartDateChange={setToStartDate}
        onEndDateChange={setToEndDate}
        onTypeChange={setToType}
        onReasonChange={setToReason}
        onSubmit={requestTimeOffAction}
      />

      {/* Vendor Event Modal */}
      <VendorEventDialog
        open={vendorModalOpen}
        onOpenChange={(open) => {
          setVendorModalOpen(open);
          if (!open) {
            setPendingVendorEvent(null);
          }
        }}
        pendingVendorEvent={pendingVendorEvent}
        vendorForm={vendorForm}
        locations={locations}
        candidateVendorShifts={vendorShiftOptions}
        onFormChange={setVendorForm}
        onCreateVendorEvent={createVendorEvent}
      />
    </div>
  );
}
