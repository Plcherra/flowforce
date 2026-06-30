import type { FormWithMeta } from "@/features/forms/hooks/useForms";

export type FormFieldReadinessRow = {
  id: string;
  form_id: string | null;
  field_type: string | null;
  is_required: boolean | null;
};

export type FormReviewerRuleRow = {
  id: string;
  form_id: string | null;
};

export type FormSubmissionReviewerRow = {
  id: string;
  submission_id: string | null;
  status: string | null;
};

export interface FormsReadinessSummary {
  totalForms: number;
  publishedForms: number;
  draftForms: number;
  archivedForms: number;
  totalSubmissions: number;
  formsWithoutFields: number;
  formsWithoutSubmissions: number;
  formsWithoutReviewers: number;
  pendingReviews: number;
  requiredFields: number;
  advancedFieldCoverage: number;
  mediaFieldCoverage: number;
  reviewItems: Array<{
    id: string;
    label: string;
    detail: string;
    severity: "critical" | "warning" | "info";
  }>;
}

const advancedFieldTypes = new Set([
  "file",
  "file_upload",
  "image",
  "video",
  "audio",
  "signature",
  "scanner",
  "scan",
  "rating",
  "location",
  "task",
]);

const mediaFieldTypes = new Set([
  "file",
  "file_upload",
  "image",
  "video",
  "audio",
  "signature",
]);

function formTitle(form: FormWithMeta) {
  return form.title?.trim() || "Untitled form";
}

export function buildFormsReadinessSummary({
  forms,
  fields,
  reviewerRules,
  submissionReviewers,
}: {
  forms: FormWithMeta[];
  fields: FormFieldReadinessRow[];
  reviewerRules: FormReviewerRuleRow[];
  submissionReviewers: FormSubmissionReviewerRow[];
}): FormsReadinessSummary {
  const publishedForms = forms.filter((form) => form.status === "published");
  const draftForms = forms.filter((form) => form.status === "draft");
  const archivedForms = forms.filter((form) => form.status === "archived");
  const fieldsByFormId = new Map<string, FormFieldReadinessRow[]>();
  fields.forEach((field) => {
    if (!field.form_id) return;
    const list = fieldsByFormId.get(field.form_id) ?? [];
    list.push(field);
    fieldsByFormId.set(field.form_id, list);
  });
  const reviewerFormIds = new Set(
    reviewerRules
      .map((rule) => rule.form_id)
      .filter((value): value is string => Boolean(value)),
  );
  const activeForms = forms.filter((form) => form.status !== "archived");
  const formsWithoutFields = activeForms.filter(
    (form) => (fieldsByFormId.get(form.id) ?? []).length === 0,
  );
  const formsWithoutSubmissions = publishedForms.filter(
    (form) => (form.submissions_count ?? 0) === 0,
  );
  const formsWithoutReviewers = publishedForms.filter(
    (form) => !reviewerFormIds.has(form.id),
  );
  const pendingReviews = submissionReviewers.filter((reviewer) => {
    const status = (reviewer.status ?? "").toLowerCase();
    return !status || status === "pending" || status === "in_review";
  }).length;
  const requiredFields = fields.filter((field) => field.is_required).length;
  const advancedFieldCoverage = fields.filter((field) =>
    advancedFieldTypes.has((field.field_type ?? "").toLowerCase()),
  ).length;
  const mediaFieldCoverage = fields.filter((field) =>
    mediaFieldTypes.has((field.field_type ?? "").toLowerCase()),
  ).length;
  const totalSubmissions = forms.reduce(
    (sum, form) => sum + (form.submissions_count ?? 0),
    0,
  );

  const reviewItems = [
    ...formsWithoutFields.slice(0, 4).map((form) => ({
      id: `fields-${form.id}`,
      label: "Form has no fields",
      detail: formTitle(form),
      severity: "critical" as const,
    })),
    ...formsWithoutReviewers.slice(0, 4).map((form) => ({
      id: `reviewer-${form.id}`,
      label: "No reviewer rule",
      detail: formTitle(form),
      severity: "warning" as const,
    })),
    ...formsWithoutSubmissions.slice(0, 4).map((form) => ({
      id: `submission-${form.id}`,
      label: "No submissions yet",
      detail: formTitle(form),
      severity: "info" as const,
    })),
  ];

  return {
    totalForms: forms.length,
    publishedForms: publishedForms.length,
    draftForms: draftForms.length,
    archivedForms: archivedForms.length,
    totalSubmissions,
    formsWithoutFields: formsWithoutFields.length,
    formsWithoutSubmissions: formsWithoutSubmissions.length,
    formsWithoutReviewers: formsWithoutReviewers.length,
    pendingReviews,
    requiredFields,
    advancedFieldCoverage,
    mediaFieldCoverage,
    reviewItems,
  };
}
