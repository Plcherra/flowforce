export type OperationsWorkflowDemoTemplateKey =
  | "opening_checklist"
  | "closing_checklist"
  | "cleaning_routine"
  | "food_safety_check";

export type OperationsWorkflowDemoTemplate = {
  key: OperationsWorkflowDemoTemplateKey;
  label: string;
  category: "opening" | "closing" | "cleaning" | "food_safety";
  proofPoint: string;
};

export type OperationsWorkflowDemoReadinessRow = {
  company_id: string;
  demo_workflows: number;
  demo_steps: number;
  demo_assignments: number;
  demo_runs: number;
  completed_runs: number;
  pending_review_runs: number;
  open_exceptions: number;
  automation_runs: number;
  execution_quality_score: number;
  desktop_demo_route: string;
  mobile_demo_route: string;
  ready_for_demo: boolean;
};

export const operationsWorkflowDemoTemplates: OperationsWorkflowDemoTemplate[] = [
  {
    key: "opening_checklist",
    label: "Opening checklist",
    category: "opening",
    proofPoint: "Staff can complete the start-of-day checklist with evidence.",
  },
  {
    key: "closing_checklist",
    label: "Closing checklist",
    category: "closing",
    proofPoint: "Managers can review closing work and signoff evidence.",
  },
  {
    key: "cleaning_routine",
    label: "Cleaning routine",
    category: "cleaning",
    proofPoint: "Repeatable sanitation routines create review-ready records.",
  },
  {
    key: "food_safety_check",
    label: "Food safety check",
    category: "food_safety",
    proofPoint: "Failed steps create exceptions, automation, and coaching data.",
  },
];

export const operationsWorkflowSignoffChecks = [
  "Demo workflows are tenant scoped and labeled as sample data.",
  "Opening, closing, cleaning, and food-safety workflows are installed.",
  "Runs, step runs, evidence, review queue, exceptions, automation, and analytics are visible.",
  "The demo route is the same `/app/operations` page used on desktop and mobile web.",
] as const;

export const isOperationsWorkflowDemoReady = (
  row: OperationsWorkflowDemoReadinessRow | null,
) =>
  Boolean(
    row?.ready_for_demo &&
      row.demo_workflows >= 4 &&
      row.demo_runs >= 4 &&
      row.open_exceptions >= 1,
  );
