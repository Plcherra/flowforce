export type SopChecklistStepType =
  | "check"
  | "measurement"
  | "signature"
  | "scan"
  | "photo"
  | "rating"
  | "task";

export type SopChecklistFieldType =
  | "yes_no"
  | "number"
  | "signature"
  | "scanner"
  | "image_upload"
  | "rating"
  | "task"
  | "textarea";

export type SopChecklistStepDraft = {
  label: string;
  description?: string;
  stepType: SopChecklistStepType;
  fieldType: SopChecklistFieldType;
  required: boolean;
  evidenceRequired: boolean;
  options?: string[];
};

export type SopChecklistTemplateDraft = {
  id: string;
  name: string;
  description: string;
  templateCategory:
    | "opening"
    | "closing"
    | "cleaning"
    | "safety"
    | "inventory";
  workflowKind: "checklist" | "sop" | "inspection" | "inventory_count";
  assignmentType: "role" | "person" | "location";
  reviewRequired: boolean;
  scheduleRule: Record<string, unknown>;
  dueWindow: Record<string, unknown>;
  escalationRule: Record<string, unknown>;
  steps: SopChecklistStepDraft[];
};

export type SopChecklistRpcPayload = {
  name: string;
  description: string;
  templatecategory: SopChecklistTemplateDraft["templateCategory"];
  workflow_kind: SopChecklistTemplateDraft["workflowKind"];
  assignment_type: SopChecklistTemplateDraft["assignmentType"];
  review_required: boolean;
  schedule_rule: Record<string, unknown>;
  due_window: Record<string, unknown>;
  escalation_rule: Record<string, unknown>;
  steps: Array<{
    label: string;
    description?: string;
    step_type: SopChecklistStepType;
    field_type: SopChecklistFieldType;
    required: boolean;
    evidence_required: boolean;
    options: string[];
    evidence_schema: Record<string, unknown>;
    exception_policy: Record<string, unknown>;
    failure_escalation: Record<string, unknown>;
  }>;
};

const defaultExceptionPolicy = {
  create_exception_on_fail: true,
  require_failed_reason: true,
};

const defaultFailureEscalation = {
  notify_manager: true,
  create_follow_up_task: true,
};

export const sopChecklistTemplatePresets: SopChecklistTemplateDraft[] = [
  {
    id: "opening",
    name: "Opening Checklist",
    description: "Daily opening readiness for front and back of house.",
    templateCategory: "opening",
    workflowKind: "checklist",
    assignmentType: "role",
    reviewRequired: true,
    scheduleRule: { frequency: "daily", anchor: "business_open" },
    dueWindow: { starts_minutes_before: 90, due_minutes_before: 15 },
    escalationRule: { overdue_minutes: 10, severity: "warning" },
    steps: [
      {
        label: "Verify opening staffing",
        stepType: "check",
        fieldType: "yes_no",
        required: true,
        evidenceRequired: false,
      },
      {
        label: "Record critical cooler temperature",
        stepType: "measurement",
        fieldType: "number",
        required: true,
        evidenceRequired: true,
      },
      {
        label: "Confirm register and station readiness",
        stepType: "check",
        fieldType: "yes_no",
        required: true,
        evidenceRequired: false,
      },
    ],
  },
  {
    id: "closing",
    name: "Closing Checklist",
    description: "End-of-day closeout with manager review.",
    templateCategory: "closing",
    workflowKind: "checklist",
    assignmentType: "role",
    reviewRequired: true,
    scheduleRule: { frequency: "daily", anchor: "business_close" },
    dueWindow: { starts_minutes_before: 60, due_minutes_after: 30 },
    escalationRule: { overdue_minutes: 15, severity: "warning" },
    steps: [
      {
        label: "Complete cash and drawer closeout",
        stepType: "signature",
        fieldType: "signature",
        required: true,
        evidenceRequired: true,
      },
      {
        label: "Secure equipment and doors",
        stepType: "check",
        fieldType: "yes_no",
        required: true,
        evidenceRequired: false,
      },
      {
        label: "Submit closing notes",
        stepType: "check",
        fieldType: "textarea",
        required: false,
        evidenceRequired: false,
      },
    ],
  },
  {
    id: "cleaning",
    name: "Cleaning Routine",
    description: "Repeatable cleaning verification with photo evidence.",
    templateCategory: "cleaning",
    workflowKind: "sop",
    assignmentType: "location",
    reviewRequired: false,
    scheduleRule: { frequency: "daily", anchor: "shift_end" },
    dueWindow: { due_minutes_after: 20 },
    escalationRule: { overdue_minutes: 20, severity: "warning" },
    steps: [
      {
        label: "Clean food-contact surfaces",
        stepType: "check",
        fieldType: "yes_no",
        required: true,
        evidenceRequired: false,
      },
      {
        label: "Upload station photo",
        stepType: "photo",
        fieldType: "image_upload",
        required: true,
        evidenceRequired: true,
      },
      {
        label: "Rate station cleanliness",
        stepType: "rating",
        fieldType: "rating",
        required: true,
        evidenceRequired: false,
      },
    ],
  },
  {
    id: "safety",
    name: "Safety Inspection",
    description: "Safety and compliance inspection with exceptions on failure.",
    templateCategory: "safety",
    workflowKind: "inspection",
    assignmentType: "role",
    reviewRequired: true,
    scheduleRule: { frequency: "weekly", anchor: "monday_open" },
    dueWindow: { due_day: "monday", due_hour: 12 },
    escalationRule: { overdue_minutes: 30, severity: "critical" },
    steps: [
      {
        label: "Inspect emergency exits",
        stepType: "check",
        fieldType: "yes_no",
        required: true,
        evidenceRequired: false,
      },
      {
        label: "Scan safety checklist placard",
        stepType: "scan",
        fieldType: "scanner",
        required: true,
        evidenceRequired: true,
      },
      {
        label: "Capture manager signoff",
        stepType: "signature",
        fieldType: "signature",
        required: true,
        evidenceRequired: true,
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory Count Routine",
    description: "Inventory count workflow tied to variance follow-up.",
    templateCategory: "inventory",
    workflowKind: "inventory_count",
    assignmentType: "location",
    reviewRequired: true,
    scheduleRule: { frequency: "weekly", anchor: "inventory_day" },
    dueWindow: { due_hour: 10 },
    escalationRule: { overdue_minutes: 20, severity: "warning" },
    steps: [
      {
        label: "Scan count sheet or shelf tag",
        stepType: "scan",
        fieldType: "scanner",
        required: true,
        evidenceRequired: true,
      },
      {
        label: "Record variance explanation",
        stepType: "check",
        fieldType: "textarea",
        required: true,
        evidenceRequired: false,
      },
      {
        label: "Create follow-up task for large variance",
        stepType: "task",
        fieldType: "task",
        required: false,
        evidenceRequired: false,
      },
    ],
  },
];

export function buildSopChecklistRpcPayload(
  draft: SopChecklistTemplateDraft,
): SopChecklistRpcPayload {
  return {
    name: draft.name,
    description: draft.description,
    templatecategory: draft.templateCategory,
    workflow_kind: draft.workflowKind,
    assignment_type: draft.assignmentType,
    review_required: draft.reviewRequired,
    schedule_rule: draft.scheduleRule,
    due_window: draft.dueWindow,
    escalation_rule: draft.escalationRule,
    steps: draft.steps.map((step) => ({
      label: step.label,
      description: step.description,
      step_type: step.stepType,
      field_type: step.fieldType,
      required: step.required,
      evidence_required: step.evidenceRequired,
      options: step.options ?? [],
      evidence_schema: {
        required: step.evidenceRequired,
        field_type: step.fieldType,
      },
      exception_policy: defaultExceptionPolicy,
      failure_escalation: defaultFailureEscalation,
    })),
  };
}
