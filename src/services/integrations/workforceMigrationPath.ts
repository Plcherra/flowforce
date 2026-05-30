import {
  buildCsvImportPreview,
  type CsvImportPreview,
  type CsvImportTemplateKey,
} from "./csvImportFramework";

export type WorkforceMigrationObject =
  | "employees"
  | "roles"
  | "schedules"
  | "tasks"
  | "messages";

export type WorkforceMigrationImportMode =
  | "csv_template"
  | "derived_from_employee_rows"
  | "archive_only";

export type WorkforceMigrationDataObject = {
  key: WorkforceMigrationObject;
  label: string;
  importMode: WorkforceMigrationImportMode;
  flowforceTarget: string;
  notes: string;
};

export type WorkforceRawRow = Record<
  string,
  string | number | null | undefined
>;

export type WorkforceCsvAdapterKey = "employees" | "schedules" | "tasks";

export type WorkforceCsvAdapterResult = {
  adapterKey: WorkforceCsvAdapterKey;
  templateKey: CsvImportTemplateKey;
  filename: string;
  csvText: string;
  preview: CsvImportPreview;
};

export type WorkforceMigrationCompletionReport = {
  source: "generic_workforce_export";
  readyForTenantImport: boolean;
  importedObjects: Record<WorkforceMigrationObject, number>;
  skippedObjects: Array<{
    object: WorkforceMigrationObject;
    reason: string;
  }>;
  previews: Record<WorkforceCsvAdapterKey, CsvImportPreview["summary"]>;
  validationErrors: number;
  nextActions: string[];
};

export const workforceMigrationDataObjects: WorkforceMigrationDataObject[] = [
  {
    key: "employees",
    label: "Employees",
    importMode: "csv_template",
    flowforceTarget: "employees, profiles, company_members, company_invites",
    notes:
      "Import first name, last name, email, role, department, and phone. Invites can be sent after review.",
  },
  {
    key: "roles",
    label: "Roles",
    importMode: "derived_from_employee_rows",
    flowforceTarget: "company_roles and product role assignment",
    notes:
      "Normalize exported workforce roles into owner, admin, manager, or team_member before custom role review.",
  },
  {
    key: "schedules",
    label: "Schedules",
    importMode: "csv_template",
    flowforceTarget: "work_schedules",
    notes:
      "Import employee email, shift date, start time, end time, role/station, and location.",
  },
  {
    key: "tasks",
    label: "Tasks",
    importMode: "csv_template",
    flowforceTarget: "operations_tasks",
    notes:
      "Import task title, description, assignee email, due date, and priority.",
  },
  {
    key: "messages",
    label: "Messages",
    importMode: "archive_only",
    flowforceTarget: "reference archive, not live message channels",
    notes:
      "Message history can be retained as a migration archive when exported, but should not be injected into live team chat by default.",
  },
] as const;

export const workforceMigrationRequiredFiles = [
  "employees.csv",
  "schedules.csv",
  "tasks.csv",
] as const;

export const workforceMigrationMappingGuide = {
  employees: {
    templateKey: "employees",
    fields: {
      first_name: ["First name", "First", "Given name", "Employee first name"],
      last_name: ["Last name", "Last", "Surname", "Employee last name"],
      email: ["Email", "Email address", "Work email", "Employee email"],
      role: ["Role", "Job role", "Permission", "Access level"],
      department: ["Department", "Team", "Location group"],
      phone: ["Phone", "Mobile", "Phone number"],
    },
  },
  schedules: {
    templateKey: "schedules",
    fields: {
      employee_email: ["Employee email", "Email", "Staff email"],
      shift_date: ["Shift date", "Date", "Scheduled date"],
      start_time: ["Start time", "Starts", "Clock in"],
      end_time: ["End time", "Ends", "Clock out"],
      role: ["Role", "Position", "Station"],
      location: ["Location", "Site", "Store"],
    },
  },
  tasks: {
    templateKey: "tasks",
    fields: {
      title: ["Task title", "Task", "Name"],
      description: ["Description", "Details", "Instructions"],
      assignee_email: ["Assignee email", "Assigned to", "Owner email"],
      due_date: ["Due date", "Deadline", "Date"],
      priority: ["Priority", "Urgency"],
    },
  },
} as const;

const workforceRoleMap: Record<string, string> = {
  owner: "owner",
  admin: "admin",
  administrator: "admin",
  "company admin": "admin",
  manager: "manager",
  supervisor: "manager",
  lead: "manager",
  employee: "team_member",
  staff: "team_member",
  "team member": "team_member",
  worker: "team_member",
};

export const sampleWorkforceExport = {
  employees: [
    {
      "Employee first name": "Maria",
      "Employee last name": "Santos",
      "Work email": "maria@example.com",
      "Access level": "Manager",
      Team: "Kitchen",
      Mobile: "+1 555 0100",
    },
    {
      "Employee first name": "Jon",
      "Employee last name": "Reed",
      "Work email": "jon@example.com",
      "Access level": "Employee",
      Team: "Front of house",
      Mobile: "+1 555 0101",
    },
  ],
  schedules: [
    {
      "Staff email": "maria@example.com",
      "Scheduled date": "2026-06-01",
      Starts: "09:00",
      Ends: "17:00",
      Station: "Line lead",
      Store: "Main",
    },
    {
      "Staff email": "jon@example.com",
      "Scheduled date": "2026-06-01",
      Starts: "10:00",
      Ends: "18:00",
      Station: "Register",
      Store: "Main",
    },
  ],
  tasks: [
    {
      Task: "Open patio",
      Details: "Set tables and check heaters",
      "Owner email": "jon@example.com",
      Deadline: "2026-06-01",
      Urgency: "medium",
    },
  ],
  messages: [
    {
      Sent: "2026-05-01T10:00:00Z",
      Sender: "maria@example.com",
      Channel: "Managers",
      Body: "Remember the prep checklist before lunch.",
    },
  ],
} as const;

export function normalizeWorkforceRole(role: string | null | undefined) {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase();
  return workforceRoleMap[normalized] ?? "team_member";
}

export function extractWorkforceRoles(rows: readonly WorkforceRawRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) =>
          pickFirstValue(row, [
            "Role",
            "Job role",
            "Permission",
            "Access level",
          ]),
        )
        .filter(Boolean)
        .map((role) => normalizeWorkforceRole(role)),
    ),
  ).sort();
}

export function buildWorkforceCsvAdapter(params: {
  adapterKey: WorkforceCsvAdapterKey;
  rows: readonly WorkforceRawRow[];
  filename?: string;
}): WorkforceCsvAdapterResult {
  const templateKey = workforceMigrationMappingGuide[params.adapterKey]
    .templateKey as CsvImportTemplateKey;
  const canonicalRows = params.rows.map((row) =>
    normalizeWorkforceRow(params.adapterKey, row),
  );
  const csvText = toCsv(canonicalRows);
  const filename = params.filename ?? `${params.adapterKey}.csv`;

  return {
    adapterKey: params.adapterKey,
    templateKey,
    filename,
    csvText,
    preview: buildCsvImportPreview({
      templateKey,
      filename,
      csvText,
    }),
  };
}

export function buildWorkforceMigrationCompletionReport(params: {
  employees: readonly WorkforceRawRow[];
  schedules: readonly WorkforceRawRow[];
  tasks: readonly WorkforceRawRow[];
  messages?: readonly WorkforceRawRow[];
}): WorkforceMigrationCompletionReport {
  const employeeAdapter = buildWorkforceCsvAdapter({
    adapterKey: "employees",
    rows: params.employees,
  });
  const scheduleAdapter = buildWorkforceCsvAdapter({
    adapterKey: "schedules",
    rows: params.schedules,
  });
  const taskAdapter = buildWorkforceCsvAdapter({
    adapterKey: "tasks",
    rows: params.tasks,
  });
  const adapters = [employeeAdapter, scheduleAdapter, taskAdapter];
  const validationErrors = adapters.reduce(
    (total, adapter) =>
      total +
      adapter.preview.issues.filter((issue) => issue.severity === "error")
        .length,
    0,
  );
  const roles = extractWorkforceRoles(params.employees);
  const messageCount = params.messages?.length ?? 0;

  return {
    source: "generic_workforce_export",
    readyForTenantImport:
      adapters.every((adapter) => adapter.preview.canImport) &&
      params.employees.length > 0,
    importedObjects: {
      employees: employeeAdapter.preview.summary.validRows,
      roles: roles.length,
      schedules: scheduleAdapter.preview.summary.validRows,
      tasks: taskAdapter.preview.summary.validRows,
      messages: 0,
    },
    skippedObjects:
      messageCount > 0
        ? [
            {
              object: "messages",
              reason:
                "Message history is retained as archive-only migration evidence for v1.",
            },
          ]
        : [],
    previews: {
      employees: employeeAdapter.preview.summary,
      schedules: scheduleAdapter.preview.summary,
      tasks: taskAdapter.preview.summary,
    },
    validationErrors,
    nextActions: [
      "Review normalized roles before sending invites.",
      "Confirm schedule dates and locations before publishing shifts.",
      "Review imported tasks before assigning operational ownership.",
      "Attach message export as archive evidence if history was provided.",
    ],
  };
}

export function isWorkforceMigrationPathReady() {
  const objects = new Set(
    workforceMigrationDataObjects.map((object) => object.key),
  );
  const report = buildWorkforceMigrationCompletionReport(sampleWorkforceExport);

  return (
    objects.has("employees") &&
    objects.has("roles") &&
    objects.has("schedules") &&
    objects.has("tasks") &&
    objects.has("messages") &&
    report.readyForTenantImport &&
    report.importedObjects.employees === 2 &&
    report.importedObjects.schedules === 2 &&
    report.importedObjects.tasks === 1 &&
    report.skippedObjects.some((object) => object.object === "messages")
  );
}

function normalizeWorkforceRow(
  adapterKey: WorkforceCsvAdapterKey,
  row: WorkforceRawRow,
) {
  if (adapterKey === "employees") {
    return {
      "First name": pickFirstValue(row, [
        "First name",
        "First",
        "Given name",
        "Employee first name",
      ]),
      "Last name": pickFirstValue(row, [
        "Last name",
        "Last",
        "Surname",
        "Employee last name",
      ]),
      Email: pickFirstValue(row, [
        "Email",
        "Email address",
        "Work email",
        "Employee email",
      ]),
      Role: normalizeWorkforceRole(
        pickFirstValue(row, ["Role", "Job role", "Permission", "Access level"]),
      ),
      Department: pickFirstValue(row, ["Department", "Team", "Location group"]),
      Phone: pickFirstValue(row, ["Phone", "Mobile", "Phone number"]),
    };
  }

  if (adapterKey === "schedules") {
    return {
      "Employee email": pickFirstValue(row, [
        "Employee email",
        "Email",
        "Staff email",
      ]),
      "Shift date": pickFirstValue(row, [
        "Shift date",
        "Date",
        "Scheduled date",
      ]),
      "Start time": pickFirstValue(row, ["Start time", "Starts", "Clock in"]),
      "End time": pickFirstValue(row, ["End time", "Ends", "Clock out"]),
      Role: pickFirstValue(row, ["Role", "Position", "Station"]),
      Location: pickFirstValue(row, ["Location", "Site", "Store"]),
    };
  }

  return {
    "Task title": pickFirstValue(row, ["Task title", "Task", "Name"]),
    Description: pickFirstValue(row, [
      "Description",
      "Details",
      "Instructions",
    ]),
    "Assignee email": pickFirstValue(row, [
      "Assignee email",
      "Assigned to",
      "Owner email",
    ]),
    "Due date": pickFirstValue(row, ["Due date", "Deadline", "Date"]),
    Priority: normalizeTaskPriority(
      pickFirstValue(row, ["Priority", "Urgency"]),
    ),
  };
}

function normalizeTaskPriority(priority: string) {
  const normalized = priority.trim().toLowerCase();
  if (["low", "medium", "high", "critical"].includes(normalized)) {
    return normalized;
  }
  return "medium";
}

function pickFirstValue(row: WorkforceRawRow, keys: string[]) {
  const value = keys
    .map((key) => row[key])
    .find(
      (candidate) =>
        candidate !== null &&
        candidate !== undefined &&
        String(candidate).trim(),
    );
  return value === null || value === undefined ? "" : String(value).trim();
}

function toCsv(rows: Array<Record<string, string>>) {
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? "")),
  ]
    .map((record) => record.map(escapeCsvValue).join(","))
    .join("\n");
}

function escapeCsvValue(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}
