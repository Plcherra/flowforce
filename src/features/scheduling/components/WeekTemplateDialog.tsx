import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWeekTemplates } from "@/features/scheduling/hooks/useWeekTemplates";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useScheduling } from "@/contexts/SchedulingContext";
import type { Tables } from "@/integrations/supabase/public-types";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import {
  getTemplateShiftCount,
  parseWeekTemplateData,
  serializeWeekToTemplate,
} from "@/features/scheduling/utils/weekTemplateSerializer";
import { Save, Calendar, Eye, Trash2 } from "lucide-react";

interface WeekTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  weekSchedules?: ShiftWithAssignments[];
  weekStart?: Date;
  onApplied?: () => void;
  bulkCreateShifts?: (
    payloads: import("@/features/scheduling/types/mutations").ShiftInsertPayload[],
  ) => Promise<boolean>;
  assign?: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  refetchAll?: () => Promise<void>;
  clearWeek?: () => Promise<boolean | void>;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekTemplateDialog({
  open,
  onOpenChange,
  selectedDate,
  weekSchedules: weekSchedulesProp,
  weekStart: weekStartProp,
  onApplied,
  bulkCreateShifts: bulkCreateShiftsProp,
  assign: assignProp,
  refetchAll: refetchAllProp,
}: WeekTemplateDialogProps) {
  const { shifts, refetchAll: contextRefetch, mutations } = useScheduling();
  const {
    templates,
    createTemplate,
    deleteTemplate,
    applyTemplate,
  } = useWeekTemplates();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("load");
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const weekStart = weekStartProp ?? startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  const weekSchedules = useMemo(() => {
    if (weekSchedulesProp) return weekSchedulesProp;
    return shifts.filter((schedule) => {
      const scheduleDate = new Date(schedule.start_time);
      return scheduleDate >= weekStart && scheduleDate < weekEnd;
    });
  }, [weekSchedulesProp, shifts, weekStart, weekEnd]);

  const bulkCreateShifts =
    bulkCreateShiftsProp ?? mutations.bulkCreateShifts;
  const assign = assignProp ?? mutations.assign;
  const refetchAll = refetchAllProp ?? contextRefetch;
  const canApply = Boolean(bulkCreateShifts && assign && refetchAll);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
  });

  const currentTemplateData = useMemo(
    () => serializeWeekToTemplate(weekSchedules, weekStart),
    [weekSchedules, weekStart],
  );

  const assignedCount = useMemo(
    () =>
      weekSchedules.reduce(
        (sum, shift) => sum + (shift.assignments?.length ?? 0),
        0,
      ),
    [weekSchedules],
  );

  const previewTemplate = templates.find((t) => t.id === previewId);
  const previewData = previewTemplate
    ? parseWeekTemplateData(previewTemplate.template_data)
    : null;

  const handleSaveTemplate = async () => {
    setLoading(true);
    try {
      const userId = profile?.id ?? null;
      const { error } = await createTemplate({
        name: newTemplate.name,
        description: newTemplate.description || null,
        template_data: currentTemplateData as unknown as Tables<"week_templates">["template_data"],
        created_by: userId,
      });

      if (error) throw error;

      setNewTemplate({ name: "", description: "" });
      setActiveTab("load");
      toast({
        title: "Template saved",
        description: `"${newTemplate.name}" saved with ${currentTemplateData.metadata.total_shifts} shifts.`,
      });
    } catch (error) {
      toast({
        title: "Error saving template",
        description:
          error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = async (template: Tables<"week_templates">) => {
    if (!canApply) {
      toast({
        title: "Templates unavailable",
        description: "Open the schedule board to load week templates.",
        variant: "destructive",
      });
      return;
    }

    if (weekSchedules.length > 0) {
      const confirmed = window.confirm(
        "This week already has shifts. Loading a template will add shifts on top. Continue?",
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const targetStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      await applyTemplate(template.id, targetStart, {
        bulkCreateShifts: bulkCreateShifts!,
        assign: assign!,
        refetchAll: refetchAll!,
      });
      toast({
        title: "Template loaded",
        description: `"${template.name}" applied to the current week.`,
      });
      onApplied?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to load template",
        description:
          error instanceof Error ? error.message : "Could not apply template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const confirmed = window.confirm("Delete this template permanently?");
    if (!confirmed) return;
    const { error } = await deleteTemplate(id);
    if (error) {
      toast({
        title: "Delete failed",
        variant: "destructive",
      });
      return;
    }
    if (previewId === id) setPreviewId(null);
    toast({ title: "Template deleted" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="week-template-dialog">
        <DialogHeader>
          <DialogTitle>Week Templates</DialogTitle>
          <DialogDescription>
            Save current week as template or load from existing templates
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="load">Load Template</TabsTrigger>
            <TabsTrigger value="save">Save Template</TabsTrigger>
          </TabsList>

          <TabsContent value="load" className="space-y-4">
            {previewData && previewTemplate ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{previewTemplate.name} — Preview</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewId(null)}
                  >
                    Back
                  </Button>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 text-sm">
                  {previewData.shifts.map((shift, index) => (
                    <div
                      key={`${shift.dayIndex}-${shift.startTime}-${index}`}
                      className="flex justify-between border-b pb-1"
                    >
                      <span>
                        {DAY_LABELS[shift.dayIndex]} {shift.startTime}–
                        {shift.endTime}
                      </span>
                      <span className="text-muted-foreground">{shift.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p>No week templates found</p>
                    <p className="text-sm">
                      Create your first template to get started
                    </p>
                  </div>
                ) : (
                  templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge variant="outline">
                            {getTemplateShiftCount(template.template_data)} shifts
                          </Badge>
                        </div>
                        {template.description ? (
                          <CardDescription>{template.description}</CardDescription>
                        ) : null}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Created{" "}
                            {new Date(template.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewId(template.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              disabled={loading}
                              data-testid={`week-template-load-${template.id}`}
                              onClick={() => handleLoadTemplate(template)}
                            >
                              Load Template
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="save" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  data-testid="week-template-name"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="e.g., Standard Week, Holiday Schedule"
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe when to use this template..."
                  rows={3}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Current Week Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Shifts:</span>
                    <span className="ml-2 font-medium">
                      {currentTemplateData.metadata.total_shifts}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Hours:</span>
                    <span className="ml-2 font-medium">
                      {currentTemplateData.metadata.total_hours}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Staff Assigned:</span>
                    <span className="ml-2 font-medium">{assignedCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Week of:</span>
                    <span className="ml-2 font-medium">
                      {format(weekStart, "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveTemplate}
                disabled={!newTemplate.name || loading}
                className="w-full"
                data-testid="week-template-save"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save as Template"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
