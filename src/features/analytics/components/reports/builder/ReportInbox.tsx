import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { AlertTriangle, FileText, Loader2, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { notifyManagersNewRequest } from "@/notifications/availability";
import type {
  EmployeeReport,
  EmployeeReportSummary,
  EmployeeReportCategory,
} from "@/types/people";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

interface ReportFormValues {
  employeeId: string;
  category: EmployeeReportCategory;
  severity: number;
  date: string;
  notes: string;
  attachment?: File | null;
}

const categories: { value: EmployeeReportCategory; label: string }[] = [
  { value: "performance", label: "Performance" },
  { value: "attendance", label: "Attendance" },
  { value: "behavior", label: "Behavior" },
  { value: "customer", label: "Customer" },
];

const severityLabels: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Critical",
};

export function ReportInbox() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formValues, setFormValues] = useState<ReportFormValues>({
    employeeId: "",
    category: "performance",
    severity: 3,
    date: dayjs().format("YYYY-MM-DD"),
    notes: "",
    attachment: undefined,
  });

  const employeesQuery = useQuery({
    queryKey: ["report-inbox-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role")
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reportsQuery = useQuery({
    queryKey: ["report-inbox-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_report")
        .select(
          "id, employee_id, date, category, severity, notes, created_at, created_by, updated_at",
        )
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const summariesQuery = useQuery({
    queryKey: ["report-inbox-summaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_report_summary")
        .select("employee_id, week_start, summary_text, generated_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async (values: ReportFormValues) => {
      if (!user) throw new Error("You must be signed in to create a report.");

      let attachmentUrl: string | null = null;
      if (values.attachment) {
        const path = `employee-reports/${values.employeeId}/${Date.now()}-${values.attachment.name}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(path, values.attachment);
        if (uploadError) throw uploadError;
        const { data: signed } = supabase.storage
          .from("attachments")
          .getPublicUrl(path);
        attachmentUrl = signed?.publicUrl ?? null;
      }

      const insertPayload = {
        employee_id: values.employeeId,
        category: values.category,
        severity: values.severity,
        date: values.date,
        notes:
          values.notes +
          (attachmentUrl ? `\nAttachment: ${attachmentUrl}` : ""),
        created_by: user.id,
      };

      const { error } = await supabase
        .from("employee_report")
        .insert(insertPayload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "The report has been recorded.",
      });
      setFormValues((prev) => ({ ...prev, notes: "", attachment: undefined }));
      queryClient.invalidateQueries({ queryKey: ["report-inbox-reports"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to create report",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const weekStart = dayjs()
        .startOf("week")
        .add(1, "day")
        .format("YYYY-MM-DD");
      const summary = await generateWeeklySummary(employeeId, weekStart);

      const { error } = await supabase.from("employee_report_summary").upsert(
        {
          employee_id: employeeId,
          week_start: weekStart,
          summary_text: summary,
        },
        { onConflict: "employee_id,week_start" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Summary generated",
        description: "Weekly summary ready for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["report-inbox-summaries"] });
    },
    onError: (error) => {
      toast({
        title: "Unable to generate summary",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const reportsByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeReport[]>();
    (reportsQuery.data ?? []).forEach((record) => {
      const bucket = map.get(record.employee_id) ?? [];
      bucket.push(record as EmployeeReport);
      map.set(record.employee_id, bucket);
    });
    return map;
  }, [reportsQuery.data]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" />
            New report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">
              Employee
            </label>
            <Select
              value={formValues.employeeId}
              onValueChange={(value) =>
                setFormValues((prev) => ({ ...prev, employeeId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employeesQuery.data ?? []).map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-muted-foreground">
                Category
              </label>
              <Select
                value={formValues.category}
                onValueChange={(value) =>
                  setFormValues((prev) => ({
                    ...prev,
                    category: value as EmployeeReportCategory,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-muted-foreground">
                Severity
              </label>
              <Select
                value={String(formValues.severity)}
                onValueChange={(value) =>
                  setFormValues((prev) => ({
                    ...prev,
                    severity: Number(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={String(level)}>
                      {level} · {severityLabels[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-muted-foreground">
                Date
              </label>
              <Input
                type="date"
                value={formValues.date}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-muted-foreground">
                Attachment
              </label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    attachment: event.target.files?.[0] ?? undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">
              Notes
            </label>
            <Textarea
              rows={5}
              placeholder="Describe the observation, context, or feedback..."
              value={formValues.notes}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
            />
          </div>

          <Button
            className="w-full"
            onClick={() => createReportMutation.mutate(formValues)}
            disabled={
              !formValues.employeeId ||
              !formValues.notes ||
              createReportMutation.isLoading
            }
          >
            {createReportMutation.isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit report
          </Button>
        </CardContent>
      </Card>

      <Card className="border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Recent reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Weekly summaries
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                generateSummaryMutation.mutate(
                  formValues.employeeId || DEFAULT_ORG_ID,
                )
              }
              disabled={
                generateSummaryMutation.isLoading || !formValues.employeeId
              }
            >
              {generateSummaryMutation.isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate summary
            </Button>
          </div>
          <div className="space-y-3">
            {(summariesQuery.data ?? []).map((summary) => (
              <div
                key={`${summary.employee_id}-${summary.week_start}`}
                className="rounded-lg border p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Week of {dayjs(summary.week_start).format("MMM D, YYYY")}
                  </span>
                  <span>Generated {dayjs(summary.generated_at).fromNow()}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {summary.summary_text}
                </p>
              </div>
            ))}
            {summariesQuery.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No summaries yet.</p>
            )}
          </div>

          <div className="space-y-3">
            {(reportsQuery.data ?? []).map((report) => {
              const employee = employeesQuery.data?.find(
                (profile) => profile.id === report.employee_id,
              );
              return (
                <div key={report.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">
                      {employee?.first_name} {employee?.last_name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{report.category}</Badge>
                      <Badge
                        variant={
                          report.severity >= 4 ? "destructive" : "secondary"
                        }
                      >
                        Severity {report.severity}
                      </Badge>
                      <span>{dayjs(report.date).format("MMM D, YYYY")}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {report.notes}
                  </p>
                </div>
              );
            })}
            {reportsQuery.data?.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded border border-dashed py-10 text-muted-foreground">
                <AlertTriangle className="h-6 w-6" />
                <span className="text-sm">
                  No reports yet. Submit a report to populate this inbox.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function generateWeeklySummary(
  employeeId: string,
  weekStart: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("employee_report")
    .select("date, category, severity, notes")
    .eq("employee_id", employeeId)
    .gte("date", weekStart)
    .lte("date", dayjs(weekStart).add(6, "day").format("YYYY-MM-DD"));
  if (error) throw error;

  const reports = data ?? [];
  if (reports.length === 0) {
    return "No notable reports this week.";
  }

  const positives = reports.filter((report) => report.severity >= 4);
  const negatives = reports.filter((report) => report.severity <= 2);
  const attendanceIssues = reports.filter(
    (report) => report.category === "attendance",
  ).length;

  const parts: string[] = [];
  if (positives.length > 0) {
    parts.push(`Positives: ${positives.length} strong highlights.`);
  }
  if (negatives.length > 0) {
    parts.push(`Risks: ${negatives.length} concerns noted.`);
  }
  if (attendanceIssues > 0) {
    parts.push(`Attendance alerts recorded ${attendanceIssues} times.`);
  }

  return parts.join(" ") || "Steady week with no exceptional trends.";
}

export default ReportInbox;
