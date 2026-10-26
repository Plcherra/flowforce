import { useTranslation } from "react-i18next";
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
import { Download, FileText, User, Calendar } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import { useForms } from "@/features/forms/hooks/useForms";
import { useFormAnswerTranslations } from "@/features/forms/hooks/useFormAnswerTranslations";
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
  const { t } = useTranslation();
  const { getFormSubmissions, getFormFields } = useForms();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const answerTranslations = useFormAnswerTranslations(
    submissions.map((submission) => ({
      id: submission.id,
      submissionData:
        submission.submissiondata &&
        typeof submission.submissiondata === "object" &&
        !Array.isArray(submission.submissiondata)
          ? (submission.submissiondata as Record<string, unknown>)
          : {},
    })),
    fields.map((field) => ({ id: field.id, field_type: field.field_type })),
  );

  useEffect(() => {
    if (open && formId) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [open, formId]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    const [submissionsResult, fieldsResult] = await Promise.all([
      getFormSubmissions(formId),
      getFormFields(formId),
    ]);

    if (submissionsResult.error || fieldsResult.error) {
      setLoadError(true);
      setSubmissions([]);
      setFields([]);
    } else {
      setSubmissions((submissionsResult.data ?? []) as FormSubmission[]);
      setFields((fieldsResult.data ?? []) as FormField[]);
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
      const submitterName = submission.submittedprofile
        ? `${submission.submittedprofile.first_name} ${submission.submittedprofile.last_name}`
        : "Anonymous";

      const row = [
        new Date(submission.submitted_at).toLocaleString(),
        submitterName,
        ...fields.map((field) => {
          const value = submission.submissiondata[field.id];
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
        <DialogContent className="flex max-h-[min(40rem,calc(100dvh-2rem))] w-[min(56rem,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[56rem]">
          <DialogHeader className="shrink-0 space-y-2 border-b px-4 py-3 pr-12">
            <div className="flex justify-between items-center">
              <DialogTitle>{t("forms.formSubmissions")}</DialogTitle>
              <div className="flex gap-2">
                <Button onClick={() => setFillDialogOpen(true)}>
                  {t("forms.fillForm")}</Button>
                {submissions.length > 0 && (
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    {t("forms.exportCsv")}</Button>
                )}
              </div>
            </div>
            <DialogDescription>
              {t("forms.viewAndManageAllFormSubmissionsExportDataOrFillOutTheFormDirectly")}{" "}
              {t("forms.submissionsFeedWork")}{" "}
              <Link to="/app/analytics" className="underline">
                {t("common.analytics")}
              </Link>
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="text-center py-8">{t("forms.loadingSubmissions")}</div>
          ) : loadError ? (
            <p className="py-6 text-sm text-destructive">{t("forms.unableToLoadSubmissions")}</p>
          ) : submissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("forms.noSubmissionsYet")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("forms.thisFormHasnTReceivedAnySubmissionsYet")}</p>
                <Button onClick={() => setFillDialogOpen(true)}>
                  {t("forms.fillForm")}</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {t(
                    submissions.length === 1
                      ? "forms.oneSubmission"
                      : "forms.manySubmissions",
                    { count: submissions.length },
                  )}
                </p>
              </div>

              <div className="space-y-4">
                {submissions.map((submission, index) => (
                  <Card key={submission.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          {t("forms.submissionNumber", {
                            number: submissions.length - index,
                          })}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {submission.submittedprofile
                              ? `${submission.submittedprofile.first_name} ${submission.submittedprofile.last_name}`
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
                          const value = submission.submissiondata[field.id];
                          if (!value && value !== 0) return null;
                          const translatedAnswer =
                            typeof value === "string"
                              ? answerTranslations.get(submission.id)?.answers[field.id]
                              : undefined;
                          const shown = translatedAnswer ?? value;

                          return (
                            <div key={field.id}>
                              <label className="text-sm font-medium text-muted-foreground">
                                {field.label}
                              </label>
                              <div className="mt-1">
                                {Array.isArray(shown) ? (
                                  <div className="flex flex-wrap gap-1">
                                    {shown.map((item, i) => (
                                      <Badge key={i} variant="secondary">
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : field.field_type === "file" ? (
                                  <Badge variant="outline">{t("forms.fileUploaded")}</Badge>
                                ) : (
                                  <p className="text-sm">{String(shown)}</p>
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
          </div>
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
