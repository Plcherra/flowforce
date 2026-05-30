export type MigrationPlaybookStageKey =
  | "scope"
  | "prepare"
  | "import"
  | "validate"
  | "connect"
  | "monitor"
  | "handoff";

export type SampleDataPackKey =
  | "restaurant_starter"
  | "retail_starter"
  | "operations_workflow_demo";

export type DemoMigrationStepKey =
  | "create_test_tenant"
  | "load_sample_packs"
  | "run_import_preview"
  | "apply_import"
  | "connect_foundation_integrations"
  | "review_monitoring"
  | "owner_signoff";

export type MigrationPlaybookStage = {
  key: MigrationPlaybookStageKey;
  label: string;
  owner: "customer" | "operator" | "support" | "bookkeeper";
  outcome: string;
  requiredArtifacts: string[];
};

export type SampleDataPack = {
  key: SampleDataPackKey;
  label: string;
  targetTenant: string;
  files: string[];
  creates: Record<string, number>;
  validates: string[];
};

export type DemoMigrationStep = {
  key: DemoMigrationStepKey;
  label: string;
  expectedResult: string;
  blocksLaunch: boolean;
};

export type TestTenantPopulationPlan = {
  tenantName: string;
  packs: SampleDataPackKey[];
  expectedRecords: Record<string, number>;
  signoffChecks: string[];
};

export const customerMigrationPlaybook: MigrationPlaybookStage[] = [
  {
    key: "scope",
    label: "Scope source systems",
    owner: "customer",
    outcome: "Confirm source tools, owners, export access, and cutover date.",
    requiredArtifacts: [
      "source_system_inventory",
      "tenant_owner",
      "cutover_window",
    ],
  },
  {
    key: "prepare",
    label: "Prepare import templates",
    owner: "operator",
    outcome: "Normalize employees, inventory, suppliers, schedules, and tasks.",
    requiredArtifacts: ["csv_templates", "field_mapping", "validation_report"],
  },
  {
    key: "import",
    label: "Run migration imports",
    owner: "support",
    outcome: "Preview, validate, apply, and record rollback references.",
    requiredArtifacts: ["import_preview", "audit_log", "rollback_report"],
  },
  {
    key: "validate",
    label: "Validate operational data",
    owner: "operator",
    outcome:
      "Confirm counts, recipes, workflows, schedules, and employee data.",
    requiredArtifacts: [
      "inventory_setup_completeness",
      "workflow_review",
      "labor_mapping",
    ],
  },
  {
    key: "connect",
    label: "Connect integration foundations",
    owner: "bookkeeper",
    outcome:
      "Confirm POS, accounting, payroll, public API, and webhook readiness.",
    requiredArtifacts: [
      "pos_foundation",
      "accounting_payroll_scope",
      "webhook_api_scope",
    ],
  },
  {
    key: "monitor",
    label: "Review integration monitoring",
    owner: "support",
    outcome:
      "Confirm last success, failures, retries, warnings, alerts, and diagnostics.",
    requiredArtifacts: ["monitoring_snapshot", "alert_rules", "diagnostics"],
  },
  {
    key: "handoff",
    label: "Customer handoff",
    owner: "customer",
    outcome: "Customer accepts migrated tenant and pilot launch readiness.",
    requiredArtifacts: ["signoff_summary", "open_risks", "owner_acceptance"],
  },
] as const;

export const sampleDataPacks: SampleDataPack[] = [
  {
    key: "restaurant_starter",
    label: "Restaurant starter",
    targetTenant: "single-location restaurant pilot",
    files: [
      "employees.csv",
      "inventory_items.csv",
      "suppliers.csv",
      "recipes.csv",
      "purchase_orders.csv",
      "schedules.csv",
      "tasks.csv",
    ],
    creates: {
      employees: 12,
      inventoryItems: 40,
      suppliers: 8,
      recipes: 15,
      purchaseOrders: 6,
      schedules: 14,
      tasks: 24,
    },
    validates: [
      "cost_engine_ready",
      "schedule_labor_ready",
      "workflow_templates_ready",
    ],
  },
  {
    key: "retail_starter",
    label: "Retail starter",
    targetTenant: "small retail team pilot",
    files: [
      "employees.csv",
      "inventory_items.csv",
      "suppliers.csv",
      "counts.csv",
      "tasks.csv",
      "forms.csv",
    ],
    creates: {
      employees: 8,
      inventoryItems: 75,
      suppliers: 6,
      counts: 4,
      tasks: 18,
      forms: 6,
    },
    validates: [
      "inventory_count_ready",
      "task_assignment_ready",
      "form_execution_ready",
    ],
  },
  {
    key: "operations_workflow_demo",
    label: "Operations workflow demo",
    targetTenant: "manager workflow demo tenant",
    files: [
      "checklists.csv",
      "sops.csv",
      "workflow_steps.csv",
      "incidents.csv",
      "training_assignments.csv",
    ],
    creates: {
      checklists: 10,
      sops: 8,
      workflowSteps: 35,
      incidents: 5,
      trainingAssignments: 12,
    },
    validates: [
      "field_execution_ready",
      "manager_review_ready",
      "compliance_pack_ready",
    ],
  },
] as const;

export const demoMigrationFlow: DemoMigrationStep[] = [
  {
    key: "create_test_tenant",
    label: "Create test tenant",
    expectedResult:
      "Tenant baseline, owner, roles, and settings are available.",
    blocksLaunch: true,
  },
  {
    key: "load_sample_packs",
    label: "Load sample data packs",
    expectedResult: "Restaurant, retail, and workflow demo packs are staged.",
    blocksLaunch: true,
  },
  {
    key: "run_import_preview",
    label: "Run import preview",
    expectedResult:
      "Mapping, validation, warning, and rollback reports are generated.",
    blocksLaunch: true,
  },
  {
    key: "apply_import",
    label: "Apply import",
    expectedResult:
      "Tenant records are created with audit logs and no critical validation errors.",
    blocksLaunch: true,
  },
  {
    key: "connect_foundation_integrations",
    label: "Connect foundation integrations",
    expectedResult:
      "POS, accounting/payroll, public API, and webhook foundations show ready status.",
    blocksLaunch: false,
  },
  {
    key: "review_monitoring",
    label: "Review monitoring",
    expectedResult:
      "Simulated failures appear clearly with retries, alerts, and support diagnostics.",
    blocksLaunch: true,
  },
  {
    key: "owner_signoff",
    label: "Owner signoff",
    expectedResult:
      "Customer accepts migrated tenant, open risks, and next live-sync work.",
    blocksLaunch: true,
  },
] as const;

export function getCustomerMigrationPlaybook() {
  return customerMigrationPlaybook;
}

export function getSampleDataPacks() {
  return sampleDataPacks;
}

export function getDemoMigrationFlow() {
  return demoMigrationFlow;
}

export function buildTestTenantPopulationPlan(
  packs: SampleDataPackKey[] = sampleDataPacks.map((pack) => pack.key),
): TestTenantPopulationPlan {
  const selectedPacks = sampleDataPacks.filter((pack) =>
    packs.includes(pack.key),
  );
  const expectedRecords = selectedPacks.reduce<Record<string, number>>(
    (totals, pack) => {
      for (const [key, value] of Object.entries(pack.creates)) {
        totals[key] = (totals[key] ?? 0) + value;
      }
      return totals;
    },
    {},
  );

  return {
    tenantName: "FlowForce migration demo tenant",
    packs,
    expectedRecords,
    signoffChecks: [
      "tenant_baseline_ready",
      "import_preview_clean",
      "sample_records_created",
      "cost_engine_smoke_ready",
      "workflow_execution_smoke_ready",
      "integration_monitoring_visible",
      "customer_acceptance_recorded",
    ],
  };
}

export function buildMigrationIntegrationSignoffReadiness() {
  const populationPlan = buildTestTenantPopulationPlan();

  return {
    customerMigrationPlaybookReady: customerMigrationPlaybook.length === 7,
    sampleDataPacksReady:
      sampleDataPacks.length === 3 &&
      populationPlan.expectedRecords.employees >= 20 &&
      populationPlan.expectedRecords.inventoryItems >= 100,
    demoMigrationFlowReady:
      demoMigrationFlow.length === 7 &&
      demoMigrationFlow.filter((step) => step.blocksLaunch).length >= 5,
    roadmapStatusReady: true,
    testTenantCanBePopulated:
      populationPlan.signoffChecks.includes("sample_records_created") &&
      populationPlan.signoffChecks.includes("integration_monitoring_visible"),
    readyForLiveCustomerCutover: false,
  };
}

export function isMigrationIntegrationSignoffReady() {
  const readiness = buildMigrationIntegrationSignoffReadiness();
  const populationPlan = buildTestTenantPopulationPlan();

  return (
    readiness.customerMigrationPlaybookReady &&
    readiness.sampleDataPacksReady &&
    readiness.demoMigrationFlowReady &&
    readiness.roadmapStatusReady &&
    readiness.testTenantCanBePopulated &&
    !readiness.readyForLiveCustomerCutover &&
    populationPlan.packs.length === 3 &&
    Object.keys(populationPlan.expectedRecords).length >= 10
  );
}
