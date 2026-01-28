/**
 * Utility functions for building review sections
 */

import React from "react";
import type { FormFieldDataLocal, FieldBuckets } from "../types/formFill";
import type { FormSubmissionData } from "@/types/api";
import type { FormFieldType } from "@/types/forms";
import type { FormReviewLayoutSection } from "@/components/forms/presentation";
import {
  FormLabelValueRow,
  FormNarrativeBlock,
  FormImageBlock,
} from "@/components/forms/presentation";
import { NARRATIVE_TYPES, ATTACHMENT_TYPES } from "../types/formFill";
import { formatAttachmentValue, formatListValue } from "./formValueFormatters";

const narrativeTypes = new Set(NARRATIVE_TYPES);
const attachmentTypes = new Set(ATTACHMENT_TYPES);

/**
 * Build review sections from field buckets and form values
 */
export function buildReviewSections(
  buckets: FieldBuckets,
  values: FormSubmissionData,
  visibleFields: Set<string>,
): FormReviewLayoutSection[] {
  const sections: FormReviewLayoutSection[] = [];

  const renderFieldValue = (field: FormFieldDataLocal) => {
    if (!visibleFields.has(field.id)) {
      return null;
    }

    const rawValue = values[field.id];
    const type = field.field_type as FormFieldType;

    if (narrativeTypes.has(type)) {
      return (
        <FormNarrativeBlock
          key={field.id}
          title={field.label}
          value={typeof rawValue === "string" ? rawValue : ""}
        />
      );
    }

    if (attachmentTypes.has(type)) {
      if (type === "image_upload") {
        const images = Array.isArray(rawValue) ? rawValue : [];
        return (
          <div key={field.id} className="space-y-3">
            <FormLabelValueRow label={field.label} />
            {images.length > 0 ? (
              images.map((src, index) => (
                <FormImageBlock
                  key={`${src}-${index}`}
                  src={typeof src === "string" ? src : undefined}
                  caption={`Image ${index + 1}`}
                />
              ))
            ) : (
              <FormImageBlock caption={field.label} />
            )}
          </div>
        );
      }
      return (
        <FormLabelValueRow
          key={field.id}
          label={field.label}
          value={formatAttachmentValue(rawValue)}
        />
      );
    }

    if (Array.isArray(rawValue)) {
      return (
        <FormLabelValueRow
          key={field.id}
          label={field.label}
          value={formatListValue(rawValue)}
        />
      );
    }

    if (rawValue && typeof rawValue === "object") {
      return (
        <FormLabelValueRow
          key={field.id}
          label={field.label}
          value={<pre>{JSON.stringify(rawValue, null, 2)}</pre>}
        />
      );
    }

    return (
      <FormLabelValueRow
        key={field.id}
        label={field.label}
        value={
          rawValue == null || String(rawValue).trim().length === 0
            ? undefined
            : String(rawValue)
        }
      />
    );
  };

  if (buckets.questions.length > 0) {
    sections.push({
      id: "section-questions",
      title: "Checklist & Questions",
      content: (
        <div className="space-y-4">
          {buckets.questions.map(renderFieldValue)}
        </div>
      ),
    });
  }

  if (buckets.operations.length > 0) {
    sections.push({
      id: "section-operations",
      title: "Operations & Impact",
      content: (
        <div className="space-y-4">
          {buckets.operations.map(renderFieldValue)}
        </div>
      ),
    });
  }

  if (buckets.attachments.length > 0) {
    sections.push({
      id: "section-attachments",
      title: "Attachments",
      content: (
        <div className="space-y-4">
          {buckets.attachments.map(renderFieldValue)}
        </div>
      ),
    });
  }

  return sections;
}
