/**
 * Utility functions for form field handling
 */

import type { FormFieldDataLocal, FieldBuckets } from "../types/formFill";
import type { FormFieldType } from "@/types/forms";
import {
  DETAIL_TYPES,
  NARRATIVE_TYPES,
  ATTACHMENT_TYPES,
} from "../types/formFill";
import { getDefaultValueForField } from "./formValueFormatters";

/**
 * Group form fields by category (questions, operations, attachments)
 */
export function groupFieldsByCategory(
  fields: FormFieldDataLocal[],
): FieldBuckets {
  const buckets: FieldBuckets = {
    questions: [],
    operations: [],
    attachments: [],
  };

  fields.forEach((field) => {
    const type = field.field_type as FormFieldType;
    if (ATTACHMENT_TYPES.includes(type)) {
      buckets.attachments.push(field);
      return;
    }
    if (NARRATIVE_TYPES.includes(type)) {
      buckets.operations.push(field);
      return;
    }
    buckets.questions.push(field);
  });

  return buckets;
}

/**
 * Get default value for a form field based on its type
 */
export function getDefaultValue(field: FormFieldDataLocal): unknown {
  const type = field.field_type as FormFieldType;
  return getDefaultValueForField(type, field.min_value ?? undefined);
}

/**
 * Get field options from field configuration
 */
export function getFieldOptions(field: FormFieldDataLocal): string[] {
  if (!field.config) return [];

  try {
    const config = JSON.parse(field.config as string) as {
      options?: string[];
    };
    return config.options ?? [];
  } catch {
    return [];
  }
}

/**
 * Parse field configuration safely
 */
export function parseConfig<T extends Record<string, unknown>>(
  config: unknown,
  defaultValue: T,
): T {
  if (!config) return defaultValue;

  try {
    if (typeof config === "string") {
      return JSON.parse(config) as T;
    }
    if (typeof config === "object") {
      return config as T;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}
