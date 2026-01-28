/**
 * Types for form fill dialog feature
 */

import type { FormFieldType } from "@/types/forms";
import type { Tables } from "@/integrations/supabase/public-types";

export type FormFieldDataLocal = Tables<"form_fields">;

export type ConditionType =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "any_of"
  | "none_of";

export interface ConditionalLogicConfig {
  enabled?: boolean;
  field_id?: string;
  condition_type?: ConditionType;
  condition_values?: unknown[];
}

export type ValidationRules = {
  conditional_logic?: ConditionalLogicConfig;
} | null;

export type WizardStepId =
  | "overview"
  | "questions"
  | "operations"
  | "attachments"
  | "review";

export interface WizardStepMeta {
  id: WizardStepId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  fieldIds?: string[];
}

export interface FieldBuckets {
  questions: FormFieldDataLocal[];
  operations: FormFieldDataLocal[];
  attachments: FormFieldDataLocal[];
}

export const DETAIL_TYPES: FormFieldType[] = [
  "text",
  "number",
  "email",
  "phone",
  "date",
  "datetime",
  "select",
  "radio",
  "checkbox",
  "yes_no",
  "number_slider",
  "rating",
  "signature",
  "scanner",
  "task",
  "image_selection",
  "location",
  "formula",
];

export const NARRATIVE_TYPES: FormFieldType[] = ["textarea", "description"];

export const ATTACHMENT_TYPES: FormFieldType[] = [
  "file",
  "file_upload",
  "image_upload",
  "video_upload",
  "audio_recording",
];
