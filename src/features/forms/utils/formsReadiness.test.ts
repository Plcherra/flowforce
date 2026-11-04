import assert from "node:assert/strict";
import { buildFormsReadinessSummary } from "./formsReadiness";
import type { FormWithMeta } from "@/features/forms/hooks/useForms";

export function runFormsReadinessTests() {
  const form = {
    id: "form-1",
    title: "Temperature log",
    status: "published",
    submissions_count: 0,
  } as FormWithMeta;
  const summary = buildFormsReadinessSummary({
    forms: [form],
    fields: [
      { id: "a", form_id: "form-1", field_type: "image_upload", is_required: true },
      { id: "b", form_id: "form-1", field_type: "number", is_required: false },
    ],
    reviewerRules: [],
    submissionReviewers: [],
  });
  assert.equal(summary.advancedFieldCoverage, 1);
  assert.equal(summary.mediaFieldCoverage, 1);
  assert.equal(summary.reviewItems.some((item) => item.labelKey === "forms.reviewNoFields"), false);
  assert.equal(summary.reviewItems.some((item) => item.labelKey === "forms.reviewNoSubmissions"), true);
}
