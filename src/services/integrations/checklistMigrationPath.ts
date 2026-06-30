export type ChecklistMigrationObject =
  | "checklists"
  | "sops"
  | "forms"
  | "locations"
  | "recurring_tasks";

export type ChecklistStepInputType =
  | "yes_no"
  | "text"
  | "number"
  | "photo"
  | "temperature"
  | "signature";

export type ChecklistMigrationImportMode =
  | "workflow_template"
  | "form_field"
  | "location_review"
  | "recurring_assignment";

export type ChecklistMigrationDataObject = {
  key: ChecklistMigrationObject;
  label: string;
  importMode: ChecklistMigrationImportMode;
  flowforceTarget: string;
  notes: string;
};

export type ChecklistRawStep = {
  title: string;
  description?: string;
  inputType?: ChecklistStepInputType | string;
  required?: boolean;
  evidenceRequired?: boolean;
  minimum?: number;
  maximum?: number;
};

export type ChecklistRawTemplate = {
  name: string;
  description?: string;
  category?: string;
  type?: "checklist" | "sop" | "inspection" | string;
  locations?: string[];
  recurrence?: "daily" | "weekly" | "monthly" | "manual" | string;
  dueWindowMinutes?: number;
  steps: ChecklistRawStep[];
};

export type ChecklistMigrationIssue = {
  templateName: string;
  stepIndex?: number;
  severity: "error" | "warning";
  code: string;
  message: string;
};

export type SopChecklistBuilderPayload = {
  name: string;
  description: string;
  templatecategory: string;
  workflow_kind: "checklist" | "sop" | "inspection" | "custom";
  review_required: boolean;
  assignment_type: "role" | "location" | "user";
  schedule_rule: {
    frequency: "daily" | "weekly" | "monthly" | "manual";
    source: "checklist_migration";
    imported_locations: string[];
  };
  due_window: {
    minutes: number;
  };
  steps: Array<{
    label: string;
    description: string;
    field_type: ChecklistStepInputType;
    step_type: "check" | "record" | "evidence";
    required: boolean;
    evidence_required: boolean;
    validation_rules: Record<string, unknown>;
    media_config: Record<string, unknown>;
    evidence_schema: Record<string, unknown>;
    failure_escalation: Record<string, unknown>;
    exception_policy: Record<string, unknown>;
  }>;
};

export type ChecklistWorkflowPreview = {
  templateName: string;
  payload: SopChecklistBuilderPayload;
  issues: ChecklistMigrationIssue[];
  canCreateWorkflow: boolean;
};

export type ChecklistPostImportReview = {
  reviewRequired: true;
  workflowName: string;
  checks: Array<{
    key: string;
    label: string;
    status: "needs_review" | "ready";
  }>;
};

export type ChecklistMigrationCompletionReport = {
  source: "generic_checklist_export";
  readyForTenantImport: boolean;
  importedObjects: Record<ChecklistMigrationObject, number>;
  workflowPreviews: number;
  validationErrors: number;
  postImportReviews: ChecklistPostImportReview[];
  nextActions: string[];
};

export const checklistMigrationDataObjects: ChecklistMigrationDataObject[] = [
  {
    key: "checklists",
    label: "Checklists",
    importMode: "workflow_template",
    flowforceTarget: "workflows and workflow_steps",
    notes:
      "Opening, closing, cleaning, and operational checklists become executable workflow templates.",
  },
  {
    key: "sops",
    label: "SOPs",
    importMode: "workflow_template",
    flowforceTarget: "workflows, forms, and workflow_steps",
    notes:
      "Procedure-style checklists become SOP templates with review required before activation.",
  },
  {
    key: "forms",
    label: "Forms",
    importMode: "form_field",
    flowforceTarget: "forms and form_fields",
    notes:
      "Checklist step input types map into FlowForce form fields and workflow steps.",
  },
  {
    key: "locations",
    label: "Locations",
    importMode: "location_review",
    flowforceTarget: "workflow assignments and business locations",
    notes:
      "Imported location names are preserved for review and should be matched to FlowForce locations before publishing.",
  },
  {
    key: "recurring_tasks",
    label: "Recurring tasks",
    importMode: "recurring_assignment",
    flowforceTarget: "workflow_assignments.schedule_rule",
    notes:
      "Recurring cadence becomes a workflow assignment schedule rule, with due windows preserved where available.",
  },
] as const;

export const checklistTemplateMapping = {
  template: {
    name: ["Checklist name", "Template", "Procedure", "SOP name"],
    description: ["Description", "Instructions", "Overview"],
    category: ["Category", "Group", "Area"],
    type: ["Type", "Workflow kind"],
    locations: ["Locations", "Stores", "Sites"],
    recurrence: ["Recurrence", "Frequency", "Cadence"],
  },
  step: {
    title: ["Step", "Task", "Question", "Item"],
    description: ["Step description", "Help text", "Instruction"],
    inputType: ["Input type", "Field type", "Response type"],
    required: ["Required", "Mandatory"],
    evidenceRequired: [
      "Evidence required",
      "Photo required",
      "Attachment required",
    ],
  },
} as const;

export const sampleChecklistExport: ChecklistRawTemplate[] = [
  {
    name: "Opening food safety check",
    description: "Daily opening routine before service.",
    category: "food_safety",
    type: "checklist",
    locations: ["Main"],
    recurrence: "daily",
    dueWindowMinutes: 90,
    steps: [
      {
        title: "Verify walk-in temperature",
        description: "Record the walk-in cooler temperature before prep.",
        inputType: "temperature",
        required: true,
        evidenceRequired: false,
        maximum: 41,
      },
      {
        title: "Check sanitizer buckets",
        description: "Confirm sanitizer is mixed and available.",
        inputType: "yes_no",
        required: true,
      },
      {
        title: "Attach prep station photo",
        description: "Capture a photo after station setup.",
        inputType: "photo",
        required: false,
        evidenceRequired: true,
      },
    ],
  },
  {
    name: "Closing cash handling SOP",
    description: "Manager procedure for end-of-day close.",
    category: "cash_control",
    type: "sop",
    locations: ["Main"],
    recurrence: "daily",
    dueWindowMinutes: 60,
    steps: [
      {
        title: "Count cash drawer",
        description: "Record expected and actual drawer total.",
        inputType: "number",
        required: true,
      },
      {
        title: "Manager signoff",
        description: "Confirm close packet is complete.",
        inputType: "signature",
        required: true,
        evidenceRequired: true,
      },
    ],
  },
];

export function buildChecklistWorkflowPreview(
  template: ChecklistRawTemplate,
): ChecklistWorkflowPreview {
  const issues = validateChecklistTemplate(template);
  const payload = buildSopChecklistPayload(template);

  return {
    templateName: template.name,
    payload,
    issues,
    canCreateWorkflow: issues.every((issue) => issue.severity !== "error"),
  };
}

export function buildChecklistMigrationPreviews(
  templates: readonly ChecklistRawTemplate[],
) {
  return templates.map(buildChecklistWorkflowPreview);
}

export function buildChecklistPostImportReview(
  preview: ChecklistWorkflowPreview,
): ChecklistPostImportReview {
  return {
    reviewRequired: true,
    workflowName: preview.payload.name,
    checks: [
      {
        key: "locations",
        label: "Match imported location names to FlowForce locations.",
        status:
          preview.payload.schedule_rule.imported_locations.length > 0
            ? "needs_review"
            : "ready",
      },
      {
        key: "recurrence",
        label: "Confirm recurring cadence and due window before publishing.",
        status: "needs_review",
      },
      {
        key: "evidence",
        label:
          "Confirm photo, signature, and temperature evidence requirements.",
        status: preview.payload.steps.some((step) => step.evidence_required)
          ? "needs_review"
          : "ready",
      },
      {
        key: "manager_approval",
        label: "Manager approves imported workflow template.",
        status: "needs_review",
      },
    ],
  };
}

export function buildChecklistMigrationCompletionReport(
  templates: readonly ChecklistRawTemplate[],
): ChecklistMigrationCompletionReport {
  const previews = buildChecklistMigrationPreviews(templates);
  const validationErrors = previews.reduce(
    (total, preview) =>
      total +
      preview.issues.filter((issue) => issue.severity === "error").length,
    0,
  );
  const locations = new Set(
    templates.flatMap((template) => template.locations ?? []),
  );
  const recurringTasks = previews.filter(
    (preview) => preview.payload.schedule_rule.frequency !== "manual",
  );
  const stepCount = previews.reduce(
    (total, preview) => total + preview.payload.steps.length,
    0,
  );

  return {
    source: "generic_checklist_export",
    readyForTenantImport:
      previews.length > 0 &&
      previews.every((preview) => preview.canCreateWorkflow),
    importedObjects: {
      checklists: previews.filter(
        (preview) => preview.payload.workflow_kind === "checklist",
      ).length,
      sops: previews.filter(
        (preview) => preview.payload.workflow_kind === "sop",
      ).length,
      forms: stepCount,
      locations: locations.size,
      recurring_tasks: recurringTasks.length,
    },
    workflowPreviews: previews.length,
    validationErrors,
    postImportReviews: previews.map(buildChecklistPostImportReview),
    nextActions: [
      "Match imported location names to FlowForce locations.",
      "Confirm recurrence and due windows before publishing assignments.",
      "Review evidence requirements for photo, signature, and temperature steps.",
      "Run manager review before activating imported workflow templates.",
    ],
  };
}

export function isChecklistMigrationPathReady() {
  const objects = new Set(
    checklistMigrationDataObjects.map((object) => object.key),
  );
  const report = buildChecklistMigrationCompletionReport(sampleChecklistExport);
  const previews = buildChecklistMigrationPreviews(sampleChecklistExport);

  return (
    objects.has("checklists") &&
    objects.has("sops") &&
    objects.has("forms") &&
    objects.has("locations") &&
    objects.has("recurring_tasks") &&
    report.readyForTenantImport &&
    report.importedObjects.checklists === 1 &&
    report.importedObjects.sops === 1 &&
    report.importedObjects.forms === 5 &&
    report.postImportReviews.every((review) => review.reviewRequired) &&
    previews.every((preview) => preview.payload.steps.length > 0)
  );
}

function buildSopChecklistPayload(
  template: ChecklistRawTemplate,
): SopChecklistBuilderPayload {
  return {
    name: String(template.name ?? "").trim(),
    description: String(template.description ?? "").trim(),
    templatecategory: normalizeCategory(template.category),
    workflow_kind: normalizeWorkflowKind(template.type),
    review_required: true,
    assignment_type: "location",
    schedule_rule: {
      frequency: normalizeFrequency(template.recurrence),
      source: "checklist_migration",
      imported_locations: normalizeLocations(template.locations),
    },
    due_window: {
      minutes: template.dueWindowMinutes ?? 120,
    },
    steps: template.steps.map((step) => {
      const fieldType = normalizeFieldType(step.inputType);
      const evidenceRequired =
        Boolean(step.evidenceRequired) ||
        fieldType === "photo" ||
        fieldType === "signature";

      return {
        label: String(step.title ?? "").trim(),
        description: String(step.description ?? "").trim(),
        field_type: fieldType,
        step_type:
          fieldType === "photo" || fieldType === "signature"
            ? "evidence"
            : fieldType === "number" || fieldType === "temperature"
              ? "record"
              : "check",
        required: step.required ?? true,
        evidence_required: evidenceRequired,
        validation_rules: buildValidationRules(step, fieldType),
        media_config:
          fieldType === "photo"
            ? { required_media_type: "image", source: "checklist_migration" }
            : {},
        evidence_schema: evidenceRequired
          ? { required: true, source: "checklist_migration" }
          : {},
        failure_escalation: {
          on_failed_required_step: "manager_review_queue",
        },
        exception_policy: {
          create_exception_on_failed_required_step: true,
        },
      };
    }),
  };
}

function validateChecklistTemplate(
  template: ChecklistRawTemplate,
): ChecklistMigrationIssue[] {
  const issues: ChecklistMigrationIssue[] = [];
  const templateName = String(template.name ?? "").trim() || "Unnamed template";

  if (!String(template.name ?? "").trim()) {
    issues.push({
      templateName,
      severity: "error",
      code: "missing_template_name",
      message: "Checklist template name is required.",
    });
  }

  if (!Array.isArray(template.steps) || template.steps.length === 0) {
    issues.push({
      templateName,
      severity: "error",
      code: "missing_steps",
      message: "At least one checklist step is required.",
    });
  }

  template.steps.forEach((step, index) => {
    if (!String(step.title ?? "").trim()) {
      issues.push({
        templateName,
        stepIndex: index,
        severity: "error",
        code: "missing_step_title",
        message: "Checklist step title is required.",
      });
    }

    if (!isSupportedFieldType(step.inputType)) {
      issues.push({
        templateName,
        stepIndex: index,
        severity: "warning",
        code: "unsupported_field_type_defaulted",
        message: "Unsupported field type will default to yes/no.",
      });
    }
  });

  if (!template.locations || template.locations.length === 0) {
    issues.push({
      templateName,
      severity: "warning",
      code: "location_review_required",
      message: "No locations were provided; assignment needs review.",
    });
  }

  return issues;
}

function normalizeWorkflowKind(
  workflowKind: ChecklistRawTemplate["type"],
): SopChecklistBuilderPayload["workflow_kind"] {
  const normalized = String(workflowKind ?? "checklist")
    .trim()
    .toLowerCase();
  if (["checklist", "sop", "inspection"].includes(normalized)) {
    return normalized as SopChecklistBuilderPayload["workflow_kind"];
  }
  return "custom";
}

function normalizeFrequency(
  recurrence: ChecklistRawTemplate["recurrence"],
): SopChecklistBuilderPayload["schedule_rule"]["frequency"] {
  const normalized = String(recurrence ?? "manual")
    .trim()
    .toLowerCase();
  if (["daily", "weekly", "monthly", "manual"].includes(normalized)) {
    return normalized as SopChecklistBuilderPayload["schedule_rule"]["frequency"];
  }
  return "manual";
}

function normalizeFieldType(
  fieldType: ChecklistRawStep["inputType"],
): ChecklistStepInputType {
  const normalized = String(fieldType ?? "yes_no")
    .trim()
    .toLowerCase();
  if (isSupportedFieldType(normalized)) {
    return normalized;
  }
  return "yes_no";
}

function isSupportedFieldType(
  fieldType: ChecklistRawStep["inputType"],
): fieldType is ChecklistStepInputType {
  return (
    typeof fieldType === "string" &&
    ["yes_no", "text", "number", "photo", "temperature", "signature"].includes(
      fieldType.trim().toLowerCase(),
    )
  );
}

function buildValidationRules(
  step: ChecklistRawStep,
  fieldType: ChecklistStepInputType,
) {
  if (fieldType !== "number" && fieldType !== "temperature") {
    return {};
  }

  return {
    minimum: step.minimum,
    maximum: step.maximum,
    unit: fieldType === "temperature" ? "fahrenheit" : undefined,
  };
}

function normalizeCategory(category: string | undefined) {
  return String(category ?? "custom")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeLocations(locations: ChecklistRawTemplate["locations"]) {
  return Array.from(
    new Set(
      (locations ?? [])
        .map((location) => String(location).trim())
        .filter(Boolean),
    ),
  );
}
