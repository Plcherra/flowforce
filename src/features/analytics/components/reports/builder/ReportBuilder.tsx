import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  _Dialog,
  _DialogContent,
  DialogHeader,
  DialogTitle,
  _DialogTrigger,
} from "@/components/ui/dialog";
import {
  useCreateReport,
  useUpdateReport,
  CustomReport,
} from "@/hooks/useReports";
import { Save, ArrowLeft } from "lucide-react";
import { logger } from "@/utils/logger";

interface ReportBuilderProps {
  report?: CustomReport;
  onSuccess?: () => void;
  onBack: () => void;
}

const REPORT_TYPES = [
  { value: "employee", label: "Employee Report" },
  { value: "timeoff", label: "Time Off Report" },
  { value: "scheduling", label: "Scheduling Report" },
  { value: "tasks", label: "Tasks Report" },
  { value: "forms", label: "Forms Report" },
];

const COLUMN_OPTIONS = {
  employee: [
    { id: "first_name", label: "First Name" },
    { id: "last_name", label: "Last Name" },
    { id: "email", label: "Email" },
    { id: "role", label: "Role" },
    { id: "employment_status", label: "Status" },
    { id: "hire_date", label: "Hire Date" },
  ],
  timeoff: [
    { id: "start_date", label: "Start Date" },
    { id: "end_date", label: "End Date" },
    { id: "type", label: "Type" },
    { id: "status", label: "Status" },
    { id: "reason", label: "Reason" },
  ],
  tasks: [
    { id: "title", label: "Title" },
    { id: "status", label: "Status" },
    { id: "priority", label: "Priority" },
    { id: "due_date", label: "Due Date" },
    { id: "created_at", label: "Created Date" },
  ],
  scheduling: [
    { id: "title", label: "Title" },
    { id: "start_time", label: "Start Time" },
    { id: "end_time", label: "End Time" },
    { id: "schedule_type", label: "Type" },
    { id: "status", label: "Status" },
  ],
  forms: [
    { id: "title", label: "Title" },
    { id: "status", label: "Status" },
    { id: "created_at", label: "Created Date" },
    { id: "description", label: "Description" },
  ],
};

export default function ReportBuilder({
  report,
  onSuccess,
  onBack,
}: ReportBuilderProps) {
  const [_open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: report?.name || "",
    description: report?.description || "",
    report_type: report?.report_type || "employee",
    columns: report?.columns || [],
    is_public: report?.is_public || false,
  });

  const createReport = useCreateReport();
  const updateReport = useUpdateReport();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const reportData = {
      ...formData,
      created_by: "", // Will be set by RLS
      filters: {},
      chart_config: {},
    };

    try {
      if (report) {
        await updateReport.mutateAsync({ id: report.id, ...reportData });
      } else {
        await createReport.mutateAsync(reportData);
      }
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      logger.error("Failed to save report:", { error, tags: ["error"] });
    }
  };

  const handleColumnToggle = (columnId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      columns: checked
        ? [...prev.columns, columnId]
        : prev.columns.filter((id) => id !== columnId),
    }));
  };

  const availableColumns =
    COLUMN_OPTIONS[formData.report_type as keyof typeof COLUMN_OPTIONS] || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <CardTitle>{report ? "Edit Report" : "Create New Report"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report_type">Report Type</Label>
              <Select
                value={formData.report_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    report_type: value as any,
                    columns: [],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Select Columns to Include</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableColumns.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.id}
                    checked={formData.columns.includes(column.id)}
                    onCheckedChange={(checked) =>
                      handleColumnToggle(column.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={column.id} className="text-sm">
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  is_public: checked as boolean,
                }))
              }
            />
            <Label htmlFor="is_public">Make this report public</Label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createReport.isPending || updateReport.isPending}
            >
              {report ? "Update Report" : "Create Report"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
