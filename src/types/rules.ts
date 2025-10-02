export type RuleSeverity = 'info' | 'warning' | 'blocking';

export interface AppRule {
  id: string;
  slug: string;
  name: string;
  description?: string;
  resource: string;
  trigger: string;
  severity: RuleSeverity;
  isEnabled: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  targets: RuleTarget[];
}

export interface RuleCondition {
  id: string;
  groupIndex: number;
  conditionIndex: number;
  conjunction: 'AND' | 'OR';
  field: string;
  operator: string;
  value?: unknown;
}

export interface RuleAction {
  id: string;
  actionType: string;
  config?: Record<string, unknown>;
  displayOrder: number;
}

export interface RuleTarget {
  id: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export interface RuleAuditEntry {
  id: string;
  ruleId: string;
  workflowId?: string;
  resource: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  status: 'allowed' | 'warning' | 'blocked';
  message?: string;
  detail?: Record<string, unknown>;
  createdAt: string;
}

