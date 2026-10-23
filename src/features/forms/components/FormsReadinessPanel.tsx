import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardCheck,
  FilePenLine,
  FileText,
  Layers,
  Paperclip,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { FormWithMeta } from "@/features/forms/hooks/useForms";
import { useProfile } from "@/hooks/useProfile";
import {
  buildFormsReadinessSummary,
  type FormFieldReadinessRow,
  type FormReviewerRuleRow,
  type FormSubmissionReviewerRow,
} from "@/features/forms/utils/formsReadiness";

interface FormsReadinessPanelProps {
  forms: FormWithMeta[];
  canCreateForms: boolean;
  onCreateForm: () => void;
}

const reviewTone: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  warning:
    "border-warning/40 bg-warning-muted text-warning-foreground",
  info: "border-primary/40 bg-primary/10 text-primary",
};

function normalizeFieldRows(value: unknown): FormFieldReadinessRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      form_id: typeof row.form_id === "string" ? row.form_id : null,
      field_type: typeof row.field_type === "string" ? row.field_type : null,
      is_required:
        typeof row.is_required === "boolean" ? row.is_required : null,
    }))
    .filter((row) => row.id);
}

function normalizeReviewerRows(value: unknown): FormReviewerRuleRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      form_id: typeof row.form_id === "string" ? row.form_id : null,
    }))
    .filter((row) => row.id);
}

function normalizeSubmissionReviewerRows(
  value: unknown,
): FormSubmissionReviewerRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      submission_id:
        typeof row.submission_id === "string"
          ? row.submission_id
          : typeof row.submissionid === "string"
            ? row.submissionid
            : null,
      status: typeof row.status === "string" ? row.status : null,
    }))
    .filter((row) => row.id);
}

export function FormsReadinessPanel({
  forms,
  canCreateForms,
  onCreateForm,
}: FormsReadinessPanelProps) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const formIds = useMemo(() => forms.map((form) => form.id), [forms]);

  const readinessQuery = useQuery({
    queryKey: ["forms-readiness", companyId, formIds.join(",")],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const fieldsQuery =
        formIds.length > 0
          ? supabase
              .from("form_fields")
              .select("id, form_id, field_type, is_required")
              .in("form_id", formIds)
          : Promise.resolve({ data: [], error: null });

      const [fieldsResult, reviewerRulesResult, submissionReviewersResult] =
        await Promise.all([
          fieldsQuery,
          formIds.length > 0
            ? supabase
                .from("form_reviewer_rules")
                .select("id, form_id")
                .in("form_id", formIds)
            : Promise.resolve({ data: [], error: null }),
          formIds.length > 0
            ? supabase
                .from("form_submission_reviewers")
                .select("id, submission_id, status")
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (fieldsResult.error) throw fieldsResult.error;
      if (reviewerRulesResult.error) throw reviewerRulesResult.error;
      if (submissionReviewersResult.error) throw submissionReviewersResult.error;

      return {
        fields: normalizeFieldRows(fieldsResult.data),
        reviewerRules: normalizeReviewerRows(reviewerRulesResult.data),
        submissionReviewers: normalizeSubmissionReviewerRows(
          submissionReviewersResult.data,
        ),
      };
    },
  });

  const summary = useMemo(
    () =>
      buildFormsReadinessSummary({
        forms,
        fields: readinessQuery.data?.fields ?? [],
        reviewerRules: readinessQuery.data?.reviewerRules ?? [],
        submissionReviewers: readinessQuery.data?.submissionReviewers ?? [],
      }),
    [forms, readinessQuery.data],
  );

  const cards = [
    {
      label: "Published",
      value: summary.publishedForms,
      detail: `${summary.draftForms} drafts`,
      icon: FileText,
    },
    {
      label: "Submissions",
      value: summary.totalSubmissions,
      detail: `${summary.pendingReviews} pending reviews`,
      icon: ClipboardCheck,
    },
    {
      label: "Fields",
      value: readinessQuery.isLoading ? "..." : summary.requiredFields,
      detail: `${summary.formsWithoutFields} forms empty`,
      icon: FilePenLine,
    },
    {
      label: "Advanced",
      value: summary.advancedFieldCoverage,
      detail: "Ratings, scans, files, signatures",
      icon: Layers,
    },
    {
      label: "Files",
      value: summary.mediaFieldCoverage,
      detail: "Private storage fields",
      icon: Paperclip,
    },
    {
      label: "Review rules",
      value: summary.publishedForms - summary.formsWithoutReviewers,
      detail: `${summary.formsWithoutReviewers} missing`,
      icon: ShieldCheck,
    },
  ];

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-1 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("forms.formsReadiness")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("forms.builderSubmissionsAdvancedFieldsAndReviewCoverageInOneView")}</p>
          </div>
          {canCreateForms && (
            <Button type="button" onClick={onCreateForm}>
              {t("forms.newForm")}</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-3">
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold leading-tight text-foreground">
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>

        {readinessQuery.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("forms.unableToLoadFormReadinessDetails")}</AlertTitle>
            <AlertDescription>
              {t("forms.formListLoadedButFieldReviewMetadataCouldNotBeChecked")}</AlertDescription>
          </Alert>
        )}

        {summary.reviewItems.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("forms.formReviewNeeded")}</AlertTitle>
            <AlertDescription>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {summary.reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-md border px-3 py-2 text-sm ${reviewTone[item.severity]}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.severity}
                      </Badge>
                    </span>
                    <span className="mt-1 block truncate">{item.detail}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-success/40 bg-success-muted p-3 text-sm text-success">
            {t("forms.publishedFormsHaveFieldsReviewCoverageAndNoImmediateSubmissionBlockers")}</div>
        )}
      </CardContent>
    </Card>
  );
}
