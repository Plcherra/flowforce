import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, User, Calendar } from "lucide-react";
import { useForms } from "@/hooks/useForms";
import FormFillDialog from "./FormFillDialog";
import { FormSubmission, FormField } from "@/types/common";

interface FormSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
}

export default function FormSubmissionsDialog({
  open,
  onOpenChange,
  formId,
}: FormSubmissionsDialogProps) {
  const { getFormSubmissions, getFormFields } = useForms();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [fillDialogOpen, setFillDialogOpen] = useState(false);

  useEffect(() => {
    if (open && formId) {
      loadData();
    }
  }, [open, formId]);

  const loadData = async () => {
    setLoading(true);
    const [submissionsResult, fieldsResult] = await Promise.all([
      getFormSubmissions(formId),
      getFormFields(formId),
    ]);

    if (!submissionsResult.error) {
      setSubmissions(submissionsResult.data);
    }
    if (!fieldsResult.error) {
      setFields(fieldsResult.data as any);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    if (submissions.length === 0) return;

    // Create CSV headers
    const headers = [
      "Submission Date",
      "Submitted By",
      ...fields.map((f) => f.label),
    ];

    // Create CSV rows
    const rows = submissions.map((submission) => {
      const submitterName = submission.submitted_profile
        ? `${submission.submitted_profile.first_name} ${submission.submitted_profile.last_name}`
        : "Anonymous";

      const row = [
        new Date(submission.submitted_at).toLocaleString(),
        submitterName,
        ...fields.map((field) => {
          const value = submission.submission_data[field.id];
          return Array.isArray(value) ? value.join(", ") : value || "";
        }),
      ];
      return row;
    });

    // Convert to CSV string
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `form-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Form Submissions</DialogTitle>
              <div className="flex gap-2">
                <Button onClick={() => setFillDialogOpen(true)}>
                  Fill Form
                </Button>
                {submissions.length > 0 && (
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
            <DialogDescription>
              View and manage all form submissions. Export data or fill out the
              form directly.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No submissions yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  This form hasn't received any submissions yet
                </p>
                <Button onClick={() => setFillDialogOpen(true)}>
                  Fill Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {submissions.length} submission
                  {submissions.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-4">
                {submissions.map((submission, index) => (
                  <Card key={submission.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          Submission #{submissions.length - index}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {submission.submitted_profile
                              ? `${submission.submitted_profile.first_name} ${submission.submitted_profile.last_name}`
                              : "Anonymous"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(submission.submitted_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {fields.map((field) => {
                          const value = submission.submission_data[field.id];
                          if (!value && value !== 0) return null;

                          return (
                            <div key={field.id}>
                              <label className="text-sm font-medium text-muted-foreground">
                                {field.label}
                              </label>
                              <div className="mt-1">
                                {Array.isArray(value) ? (
                                  <div className="flex flex-wrap gap-1">
                                    {value.map((item, i) => (
                                      <Badge key={i} variant="secondary">
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : field.field_type === "file" ? (
                                  <Badge variant="outline">File uploaded</Badge>
                                ) : (
                                  <p className="text-sm">{String(value)}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FormFillDialog
        open={fillDialogOpen}
        onOpenChange={setFillDialogOpen}
        formId={formId}
        onSubmitted={loadData}
      />
    </>
  );
}
