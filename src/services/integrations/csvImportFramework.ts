export type CsvImportTemplateKey =
  | "employees"
  | "inventory_items"
  | "suppliers"
  | "schedules"
  | "tasks";

export type CsvImportValueType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "time"
  | "enum";

export type CsvImportSeverity = "error" | "warning";
export type CsvImportBatchStatus =
  | "uploaded"
  | "mapped"
  | "validated"
  | "importing"
  | "completed"
  | "failed"
  | "rolled_back";

export type CsvImportField = {
  key: string;
  label: string;
  required: boolean;
  valueType: CsvImportValueType;
  aliases: string[];
  example: string;
  enumValues?: string[];
};

export type CsvImportTemplate = {
  key: CsvImportTemplateKey;
  label: string;
  targetTable: string;
  rollbackStrategy: "delete_inserted_records" | "reverse_adjustment";
  fields: CsvImportField[];
};

export type CsvParsedRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type CsvParseResult = {
  headers: string[];
  rows: CsvParsedRow[];
  errors: CsvImportIssue[];
};

export type CsvImportMapping = Record<string, string | null>;

export type CsvImportIssue = {
  rowNumber: number | null;
  fieldKey?: string;
  severity: CsvImportSeverity;
  code: string;
  message: string;
};

export type CsvImportPreviewRow = {
  rowNumber: number;
  source: Record<string, string>;
  mapped: Record<string, string>;
  issues: CsvImportIssue[];
};

export type CsvImportPreview = {
  templateKey: CsvImportTemplateKey;
  filename: string;
  headers: string[];
  mapping: CsvImportMapping;
  rows: CsvImportPreviewRow[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warningRows: number;
  };
  issues: CsvImportIssue[];
  canImport: boolean;
};

export type CsvImportResult = {
  batchId: string;
  templateKey: CsvImportTemplateKey;
  status: CsvImportBatchStatus;
  importedRows: number;
  failedRows: number;
  rollbackAvailable: boolean;
  rollbackReference: string;
  errorReport: CsvImportIssue[];
};

export type CsvRollbackPlan = {
  batchId: string;
  strategy: CsvImportTemplate["rollbackStrategy"];
  targetTable: string;
  targetRecordIds: string[];
  canRollback: boolean;
  warnings: string[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export const csvImportTemplates: Record<
  CsvImportTemplateKey,
  CsvImportTemplate
> = {
  employees: {
    key: "employees",
    label: "Employees",
    targetTable: "employees",
    rollbackStrategy: "delete_inserted_records",
    fields: [
      field(
        "first_name",
        "First name",
        true,
        "text",
        ["first", "given name"],
        "Maria",
      ),
      field(
        "last_name",
        "Last name",
        true,
        "text",
        ["last", "surname"],
        "Santos",
      ),
      field(
        "email",
        "Email",
        true,
        "email",
        ["email address", "work email"],
        "maria@example.com",
      ),
      field(
        "role",
        "Role",
        true,
        "enum",
        ["job role", "position"],
        "team_member",
        ["owner", "admin", "manager", "team_member"],
      ),
      field("department", "Department", false, "text", ["team"], "Kitchen"),
      field(
        "phone",
        "Phone",
        false,
        "text",
        ["mobile", "phone number"],
        "+1 555 0100",
      ),
    ],
  },
  inventory_items: {
    key: "inventory_items",
    label: "Inventory items",
    targetTable: "inv_items",
    rollbackStrategy: "delete_inserted_records",
    fields: [
      field("name", "Item name", true, "text", ["item", "product"], "Tomatoes"),
      field("sku", "SKU", false, "text", ["item code", "code"], "PROD-001"),
      field("unit", "Unit", true, "text", ["base unit", "uom"], "lb"),
      field("category", "Category", false, "text", ["group"], "Produce"),
      field(
        "par_level",
        "Par level",
        false,
        "number",
        ["par", "target stock"],
        "25",
      ),
      field(
        "unit_cost",
        "Unit cost",
        false,
        "number",
        ["cost", "price"],
        "2.45",
      ),
    ],
  },
  suppliers: {
    key: "suppliers",
    label: "Suppliers",
    targetTable: "inv_suppliers",
    rollbackStrategy: "delete_inserted_records",
    fields: [
      field(
        "name",
        "Supplier name",
        true,
        "text",
        ["vendor", "supplier"],
        "Fresh Farms",
      ),
      field(
        "contact_name",
        "Contact name",
        false,
        "text",
        ["contact"],
        "Ana Silva",
      ),
      field(
        "email",
        "Email",
        false,
        "email",
        ["email address"],
        "orders@example.com",
      ),
      field("phone", "Phone", false, "text", ["telephone"], "+1 555 0110"),
      field(
        "payment_terms",
        "Payment terms",
        false,
        "text",
        ["terms"],
        "Net 15",
      ),
    ],
  },
  schedules: {
    key: "schedules",
    label: "Schedules",
    targetTable: "work_schedules",
    rollbackStrategy: "delete_inserted_records",
    fields: [
      field(
        "employee_email",
        "Employee email",
        true,
        "email",
        ["email", "staff email"],
        "maria@example.com",
      ),
      field("shift_date", "Shift date", true, "date", ["date"], "2026-06-01"),
      field(
        "start_time",
        "Start time",
        true,
        "time",
        ["starts", "clock in"],
        "09:00",
      ),
      field(
        "end_time",
        "End time",
        true,
        "time",
        ["ends", "clock out"],
        "17:00",
      ),
      field("role", "Role", false, "text", ["station"], "Line cook"),
      field("location", "Location", false, "text", ["site"], "Main"),
    ],
  },
  tasks: {
    key: "tasks",
    label: "Tasks",
    targetTable: "operations_tasks",
    rollbackStrategy: "delete_inserted_records",
    fields: [
      field(
        "title",
        "Task title",
        true,
        "text",
        ["task", "name"],
        "Open patio",
      ),
      field(
        "description",
        "Description",
        false,
        "text",
        ["details"],
        "Set tables and check heaters",
      ),
      field(
        "assignee_email",
        "Assignee email",
        false,
        "email",
        ["assigned to", "owner email"],
        "maria@example.com",
      ),
      field("due_date", "Due date", false, "date", ["deadline"], "2026-06-01"),
      field("priority", "Priority", false, "enum", ["urgency"], "medium", [
        "low",
        "medium",
        "high",
        "critical",
      ]),
    ],
  },
} as const;

export const csvImportAuditActions = {
  started: "integration.csv_import.started",
  validated: "integration.csv_import.validated",
  completed: "integration.csv_import.completed",
  failed: "integration.csv_import.failed",
  rolledBack: "integration.csv_import.rolled_back",
} as const;

export function parseCsvText(csvText: string): CsvParseResult {
  const records = parseCsvRecords(csvText);
  const headers =
    records[0]?.map((header) => header.trim()).filter(Boolean) ?? [];
  const errors: CsvImportIssue[] = [];

  if (headers.length === 0) {
    errors.push({
      rowNumber: null,
      severity: "error",
      code: "missing_headers",
      message: "CSV file must include a header row.",
    });
  }

  const rows = records.slice(1).flatMap((record, index) => {
    if (record.length === 1 && !record[0]?.trim()) {
      return [];
    }

    const values: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      values[header] = record[headerIndex]?.trim() ?? "";
    });

    if (record.length > headers.length) {
      errors.push({
        rowNumber: index + 2,
        severity: "warning",
        code: "extra_columns",
        message:
          "Row has more columns than the header row; extra values will be ignored.",
      });
    }

    return [{ rowNumber: index + 2, values }];
  });

  return { headers, rows, errors };
}

export function inferCsvMapping(
  templateKey: CsvImportTemplateKey,
  headers: string[],
): CsvImportMapping {
  const template = csvImportTemplates[templateKey];
  const normalizedHeaders = new Map(
    headers.map((header) => [normalizeHeader(header), header]),
  );

  return Object.fromEntries(
    template.fields.map((templateField) => {
      const candidates = [
        templateField.key,
        templateField.label,
        ...templateField.aliases,
      ].map(normalizeHeader);
      const matchedHeader =
        candidates
          .map((candidate) => normalizedHeaders.get(candidate))
          .find(Boolean) ?? null;

      return [templateField.key, matchedHeader];
    }),
  );
}

export function buildCsvImportPreview(params: {
  templateKey: CsvImportTemplateKey;
  filename: string;
  csvText: string;
  mapping?: CsvImportMapping;
}): CsvImportPreview {
  const parsed = parseCsvText(params.csvText);
  const mapping =
    params.mapping ?? inferCsvMapping(params.templateKey, parsed.headers);
  const template = csvImportTemplates[params.templateKey];
  const issues = [...parsed.errors];

  const previewRows = parsed.rows.map((row) => {
    const mapped = mapCsvRow(row.values, mapping);
    const rowIssues = validateMappedRow(template, row.rowNumber, mapped);
    issues.push(...rowIssues);

    return {
      rowNumber: row.rowNumber,
      source: row.values,
      mapped,
      issues: rowIssues,
    };
  });

  template.fields
    .filter(
      (templateField) => templateField.required && !mapping[templateField.key],
    )
    .forEach((templateField) => {
      issues.push({
        rowNumber: null,
        fieldKey: templateField.key,
        severity: "error",
        code: "missing_required_mapping",
        message: `${templateField.label} must be mapped before import.`,
      });
    });

  const invalidRows = previewRows.filter((row) =>
    row.issues.some((issue) => issue.severity === "error"),
  ).length;
  const warningRows = previewRows.filter(
    (row) =>
      row.issues.some((issue) => issue.severity === "warning") &&
      !row.issues.some((issue) => issue.severity === "error"),
  ).length;

  return {
    templateKey: params.templateKey,
    filename: params.filename,
    headers: parsed.headers,
    mapping,
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      validRows: previewRows.length - invalidRows,
      invalidRows,
      warningRows,
    },
    issues,
    canImport:
      previewRows.length > 0 &&
      issues.every((issue) => issue.severity !== "error"),
  };
}

export function buildCsvImportResult(params: {
  batchId: string;
  preview: CsvImportPreview;
  importedRecordIds?: string[];
}): CsvImportResult {
  const errorReport = params.preview.issues.filter(
    (issue) => issue.severity === "error",
  );
  const importedRows = params.preview.canImport
    ? params.preview.summary.validRows
    : 0;

  return {
    batchId: params.batchId,
    templateKey: params.preview.templateKey,
    status: params.preview.canImport ? "completed" : "failed",
    importedRows,
    failedRows: params.preview.canImport
      ? 0
      : params.preview.summary.invalidRows,
    rollbackAvailable:
      params.preview.canImport && (params.importedRecordIds?.length ?? 0) > 0,
    rollbackReference: `csv-import:${params.batchId}`,
    errorReport,
  };
}

export function buildCsvRollbackPlan(params: {
  batchId: string;
  templateKey: CsvImportTemplateKey;
  targetRecordIds: string[];
}): CsvRollbackPlan {
  const template = csvImportTemplates[params.templateKey];
  return {
    batchId: params.batchId,
    strategy: template.rollbackStrategy,
    targetTable: template.targetTable,
    targetRecordIds: [...params.targetRecordIds],
    canRollback: params.targetRecordIds.length > 0,
    warnings:
      params.targetRecordIds.length > 0
        ? []
        : ["No imported target record ids were captured for rollback."],
  };
}

export function getCsvTemplateDownloadRows(templateKey: CsvImportTemplateKey) {
  const template = csvImportTemplates[templateKey];
  const headers = template.fields.map((templateField) => templateField.label);
  const examples = template.fields.map(
    (templateField) => templateField.example,
  );
  return [headers, examples];
}

export function isCsvImportFrameworkReady() {
  const requiredTemplates: CsvImportTemplateKey[] = [
    "employees",
    "inventory_items",
    "suppliers",
    "schedules",
    "tasks",
  ];

  const hasRequiredTemplates = requiredTemplates.every((templateKey) => {
    const template = csvImportTemplates[templateKey];
    return (
      template.fields.some((templateField) => templateField.required) &&
      template.targetTable.length > 0 &&
      template.rollbackStrategy === "delete_inserted_records"
    );
  });

  const auditActions = new Set(Object.values(csvImportAuditActions));

  return (
    hasRequiredTemplates &&
    auditActions.has("integration.csv_import.started") &&
    auditActions.has("integration.csv_import.validated") &&
    auditActions.has("integration.csv_import.completed") &&
    auditActions.has("integration.csv_import.failed") &&
    auditActions.has("integration.csv_import.rolled_back")
  );
}

function field(
  key: string,
  label: string,
  required: boolean,
  valueType: CsvImportValueType,
  aliases: string[],
  example: string,
  enumValues?: string[],
): CsvImportField {
  return { key, label, required, valueType, aliases, example, enumValues };
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapCsvRow(source: Record<string, string>, mapping: CsvImportMapping) {
  return Object.fromEntries(
    Object.entries(mapping).map(([fieldKey, sourceHeader]) => [
      fieldKey,
      sourceHeader ? (source[sourceHeader] ?? "") : "",
    ]),
  );
}

function validateMappedRow(
  template: CsvImportTemplate,
  rowNumber: number,
  mapped: Record<string, string>,
) {
  return template.fields.flatMap((templateField) => {
    const value = mapped[templateField.key]?.trim() ?? "";
    const issues: CsvImportIssue[] = [];

    if (templateField.required && !value) {
      issues.push({
        rowNumber,
        fieldKey: templateField.key,
        severity: "error",
        code: "required_value_missing",
        message: `${templateField.label} is required.`,
      });
      return issues;
    }

    if (!value) {
      return issues;
    }

    if (templateField.valueType === "email" && !EMAIL_PATTERN.test(value)) {
      issues.push(typeIssue(rowNumber, templateField, "invalid_email"));
    }

    if (templateField.valueType === "number" && Number.isNaN(Number(value))) {
      issues.push(typeIssue(rowNumber, templateField, "invalid_number"));
    }

    if (templateField.valueType === "date" && !DATE_PATTERN.test(value)) {
      issues.push(typeIssue(rowNumber, templateField, "invalid_date"));
    }

    if (templateField.valueType === "time" && !TIME_PATTERN.test(value)) {
      issues.push(typeIssue(rowNumber, templateField, "invalid_time"));
    }

    if (
      templateField.valueType === "enum" &&
      templateField.enumValues &&
      !templateField.enumValues.includes(value.toLowerCase())
    ) {
      issues.push({
        rowNumber,
        fieldKey: templateField.key,
        severity: "error",
        code: "invalid_enum",
        message: `${templateField.label} must be one of: ${templateField.enumValues.join(", ")}.`,
      });
    }

    return issues;
  });
}

function typeIssue(
  rowNumber: number,
  templateField: CsvImportField,
  code: string,
): CsvImportIssue {
  return {
    rowNumber,
    fieldKey: templateField.key,
    severity: "error",
    code,
    message: `${templateField.label} must be a valid ${templateField.valueType}.`,
  };
}

function parseCsvRecords(csvText: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRecord.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRecord.push(currentValue);
      records.push(currentRecord);
      currentRecord = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentValue);
    records.push(currentRecord);
  }

  return records;
}
