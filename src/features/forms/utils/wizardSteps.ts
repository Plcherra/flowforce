/**
 * Utility functions for building wizard steps
 */

import {
  Info,
  ClipboardList,
  Layers,
  FileImage,
  CheckCircle,
} from "lucide-react";
import type { FieldBuckets, WizardStepMeta } from "../types/formFill";

/**
 * Build wizard steps from field buckets
 */
export function buildWizardSteps(buckets: FieldBuckets): WizardStepMeta[] {
  const steps: WizardStepMeta[] = [
    { id: "overview", name: "forms.stepOverview", icon: Info },
  ];

  if (buckets.questions.length > 0) {
    steps.push({
      id: "questions",
      name: "forms.stepQuestions",
      icon: ClipboardList,
      fieldIds: buckets.questions.map((field) => field.id),
    });
  }

  if (buckets.operations.length > 0) {
    steps.push({
      id: "operations",
      name: "forms.stepOperations",
      icon: Layers,
      fieldIds: buckets.operations.map((field) => field.id),
    });
  }

  if (buckets.attachments.length > 0) {
    steps.push({
      id: "attachments",
      name: "forms.stepAttachments",
      icon: FileImage,
      fieldIds: buckets.attachments.map((field) => field.id),
    });
  }

  steps.push({ id: "review", name: "forms.stepReview", icon: CheckCircle });
  return steps;
}
