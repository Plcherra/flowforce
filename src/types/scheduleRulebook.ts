export type RulebookId = string;

export interface ScheduleRulebook {
  id: RulebookId;
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
  ownerRole: string;
  // Ordered list of steps; each step can have gates, tasks and outcomes.
  steps: RulebookStep[];
  // Optional: additional global constraints that apply across steps.
  constraints?: RulebookConstraint[];
}

export interface RulebookStep {
  id: string; // slug identifier
  recordId?: string; // UUID from Supabase
  title: string;
  purpose: string;
  // Some steps are manual, others can be automated.
  mode: "manual" | "assisted" | "automated";
  // Which roles are allowed to complete this step.
  allowedRoles: string[];
  // What information must be present before the step is considered satisfied.
  completionCriteria: StepCriterion[];
  // Optional guardrails to block downstream actions until the step is complete.
  blockers?: StepBlocker[];
  // Optional follow-up actions triggered automatically after completion.
  followUps?: StepFollowUp[];
}

export interface StepCriterion {
  id: string; // slug identifier
  recordId?: string; // UUID from Supabase
  label: string;
  description?: string;
  evidenceType: "checkbox" | "numeric" | "document" | "approval" | "external";
  // If evidenceType is numeric, define acceptable threshold.
  targetValue?: number;
  // Optional role required to approve/confirm the criterion.
  approverRole?: string;
  // If the criterion pulls data from the system, list the source key.
  dataSource?: string;
}

export interface StepBlocker {
  id: string;
  recordId?: string;
  message: string;
  // Which actions are blocked (e.g., publish_schedule, send_notifications).
  actions: string[];
}

export interface StepFollowUp {
  id: string;
  recordId?: string;
  description: string;
  // Optional automation hook (e.g., call integration, send message).
  automationKey?: string;
  // Who is notified after completion.
  notifyRoles?: string[];
}

export interface RulebookConstraint {
  id: string;
  recordId?: string;
  label: string;
  description: string;
  // Constraint applies either globally or to specific steps/actions.
  scope: "global" | "action";
  actions?: string[];
  validatorKey: string;
  severity: "warning" | "blocking";
}
