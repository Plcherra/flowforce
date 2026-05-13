import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { AssignmentPanel } from "@/features/scheduling/components/drag-drop/AssignmentPanel";
import { ScheduleToolbar } from "@/features/scheduling/components/drag-drop/ScheduleToolbar";
import { WeekGrid } from "@/features/scheduling/components/drag-drop/WeekGrid";
import { ShiftDetailsPanel } from "@/features/scheduling/components/ShiftDetailsPanel";
import { ShiftWizardDialog } from "@/features/scheduling/components/ShiftWizardDialog";
import { WeekTemplateDialog } from "@/features/scheduling/components/WeekTemplateDialog";
import { ImportShiftsDialog } from "@/features/scheduling/components/ImportShiftsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { PendingVendorEvent, AIRecommendation } from "./drag-drop/types";
import {
  ROLE_TEMPLATES,
  VENDOR_PALETTE,
  getVendorLabel,
  getVendorColor,
} from "@/features/scheduling/constants/templates";
import { useDragDropHandlers } from "@/features/scheduling/hooks/useDragDropHandlers";
import { useVendorForm } from "@/features/scheduling/hooks/useVendorForm";
import {
  MultiAddShiftDialog,
  AddUnavailabilityDialog,
  AddTimeOffDialog,
  VendorEventDialog,
} from "./dialogs";

interface DragDropScheduleCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  locationFilter?: string;
}

export function DragDropScheduleCalendar({
  selectedDate,
  onDateChange,
  locationFilter,
}: DragDropScheduleCalendarProps) {
  const { toast } = useToast();
  const [draggedVendor, setDraggedVendor] = useState<
    (typeof VENDOR_PALETTE)[number] | null
  >(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [pendingVendorEvent, setPendingVendorEvent] =
    useState<PendingVendorEvent | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<
    (typeof ROLE_TEMPLATES)[number] | null
  >(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [aiRecommendations, setAIRecommendations] = useState<
    AIRecommendation[]
  >([]);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [showShiftSheet, setShowShiftSheet] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWeekTemplates, setShowWeekTemplates] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
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
  const [showDailyInfo, setShowDailyInfo] = useState(true);

  const {
    employees,
    timeOffRequests,
    unavailability: unavailabilityList,
    vendorEvents,
    vendorEventsThisWeek,
    weekSchedules,
    weekStart,
    weekDays,
    locations,
    candidateVendorShifts,
    unassignedShifts,
    vendorEventsByShift,
    disabledDates,
    weekCsvContent,
    weekCsvFilename,
    loading,
    actions,
  } = useScheduleBoard({ selectedDate, locationFilter, pendingVendorEvent });

  const {
    createSchedule,
    updateSchedule,
    assign,
    unassign,
    createVendorEvent,
    addUnavailability: addUnavailabilityAction,
    requestTimeOff: requestTimeOffAction,
    bulkCreateShifts: bulkCreateShiftsAction,
    generateRecommendations: generateRecommendationsAction,
    refetchAll,
    autoFillWeek: autoFillWeekAction,
    copyPreviousWeek: copyPreviousWeekAction,
    clearCurrentWeek: clearCurrentWeekAction,
    publishWeekStatus: publishWeekStatusAction,
  } = actions;

  const { vendorForm, setVendorForm } = useVendorForm({
    pendingVendorEvent,
    locations,
    candidateVendorShifts,
    vendorModalOpen,
  });

  const {
    handleTemplateDragStart,
    handleVendorDragStart,
    handleDragOver,
    handleBoardDrop,
  } = useDragDropHandlers({
    draggedTemplate,
    draggedVendor,
    createSchedule: createSchedule as any,
    assign,
    refetchAll,
    setPendingVendorEvent,
    setVendorModalOpen,
    setDraggedTemplate,
    setDraggedVendor,
    locationFilter,
  });

  const openShiftDetails = (scheduleId: string) => {
    setSelectedShift(scheduleId);
    setShowShiftSheet(true);
  };

  const generateAIRecommendations = async (scheduleId: string) => {
    const recommendations = await generateRecommendationsAction(scheduleId);
    if (recommendations.length > 0) {
      setAIRecommendations(recommendations);
      setShowAIRecommendations(true);
      setSelectedShift(scheduleId);
    }
  };

  const handleTimeOffTypeChange = useCallback(
    (value: string) => {
      if (
        value === "vacation" ||
        value === "sick" ||
        value === "personal" ||
        value === "other"
      ) {
        setToType(value);
      }
    },
    [setToType],
  );

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
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Loading schedule...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-72 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <AssignmentPanel
        showTemplates={showTemplates}
        templates={ROLE_TEMPLATES}
        vendors={VENDOR_PALETTE}
        onTemplateDragStart={handleTemplateDragStart}
        onVendorDragStart={handleVendorDragStart}
        onAutoFillWeek={autoFillWeekAction}
        onQuickVendorVisit={async () => {
          try {
            await createVendorEvent({
              vendor_type: "general",
              event_date: selectedDate.toISOString().split("T")[0],
              start_time: "09:00",
              end_time: "10:00",
              notes: "Quick vendor visit",
            });
          } catch (error) {
            toast({
              title: "Failed to log vendor visit",
              variant: "destructive",
            });
          }
        }}
        showAIRecommendations={showAIRecommendations}
        aiRecommendations={aiRecommendations}
        onAssignFromAI={(recommendation) =>
          toast({
            title: "Staff assigned!",
            description: `${recommendation.name} has been assigned to this shift`,
          })
        }
      />

      {/* Calendar Grid */}
      <Card className="flex-1">
        <ScheduleToolbar
          weekStart={weekStart}
          selectedDate={selectedDate}
          weekSchedules={weekSchedules}
          minimizedView={minimizedView}
          showDailyInfo={showDailyInfo}
          onDateChange={onDateChange}
          onToggleTemplates={() => setShowTemplates((value) => !value)}
          onOpenWeekTemplates={() => setShowWeekTemplates(true)}
          onCopyPreviousWeek={copyPreviousWeekAction}
          onAutoFillWeek={autoFillWeekAction}
          onClearWeek={clearCurrentWeekAction}
          onPublishWeek={publishWeekStatusAction}
          onExportWeekCsv={exportWeekCsv}
          onOpenAddShift={() => setShowAddShift(true)}
          onOpenMultiAdd={() => setShowMultiAdd(true)}
          onOpenImportShifts={() => setShowImportShifts(true)}
          onOpenAddUnavailability={() => setShowAddUnavailability(true)}
          onOpenAddTimeOff={() => setShowAddTimeOff(true)}
          onPrintWeek={() => window.print()}
          setMinimizedView={setMinimizedView}
          setShowDailyInfo={setShowDailyInfo}
        />
        <CardContent className="p-0">
          <WeekGrid
            weekDays={weekDays}
            employees={employees}
            weekSchedules={weekSchedules}
            unassignedShifts={unassignedShifts}
            vendorEvents={vendorEventsThisWeek}
            vendorEventsByShift={vendorEventsByShift}
            disabledDates={disabledDates}
            onShiftClick={openShiftDetails}
            onDrop={handleBoardDrop}
            onDragOver={handleDragOver}
            getVendorLabel={getVendorLabel}
            getVendorColor={getVendorColor}
          />
        </CardContent>
      </Card>

      {/* Week Template Dialog */}
      <WeekTemplateDialog
        open={showWeekTemplates}
        onOpenChange={setShowWeekTemplates}
        selectedDate={selectedDate}
      />

      {/* Shift Details Sheet */}
      {selectedShift && (
        <Sheet open={showShiftSheet} onOpenChange={setShowShiftSheet}>
          <SheetContent side="right" className="sm:max-w-xl w-full p-0">
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
        onOpenChange={setShowAddShift}
        selectedDate={selectedDate}
      />

      {/* Import Shifts Dialog */}
      <ImportShiftsDialog
        open={showImportShifts}
        onOpenChange={setShowImportShifts}
      />

      {/* Add Multiple Shifts Dialog */}
      <Dialog open={showMultiAdd} onOpenChange={setShowMultiAdd}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Multiple Shifts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="mtitle">Title</Label>
              <Input
                id="mtitle"
                value={multiTitle}
                onChange={(e) => setMultiTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  value={multiStart}
                  onChange={(e) => setMultiStart(e.target.value)}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  value={multiEnd}
                  onChange={(e) => setMultiEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Days of this week</Label>
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
                    {format(d, "EEE")}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Required headcount</Label>
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
                Cancel
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
                      timezone: "UTC",
                      required_headcount: multiHeadcount,
                      notes: null,
                      break_minutes: 30,
                      hourly_rate: 15.0,
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
                Create
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
        candidateVendorShifts={candidateVendorShifts}
        onFormChange={setVendorForm}
        onCreateVendorEvent={createVendorEvent}
      />

      {/* Weekly summary footer removed; summary now in header */}
    </div>
  );
}
