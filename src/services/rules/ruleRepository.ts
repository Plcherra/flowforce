import { supabase } from "@/integrations/supabase/client";
import type {
  AppRule,
  RuleCondition,
  RuleAction,
  RuleTarget,
  RuleAuditEntry,
} from "@/types/rules";
import { logger } from "@/utils/logger";

type DbRule = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  resource: string;
  trigger: string;
  severity: string;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  app_rule_conditions: DbRuleCondition[];
  app_rule_actions: DbRuleAction[];
  app_rule_targets: DbRuleTarget[];
};

type DbRuleCondition = {
  id: string;
  group_index: number;
  condition_index: number;
  conjunction: "AND" | "OR";
  field: string;
  operator: string;
  value: unknown;
};

type DbRuleAction = {
  id: string;
  action_type: string;
  config: unknown;
  display_order: number;
};

type DbRuleTarget = {
  id: string;
  target_type: string;
  target_id: string | null;
  metadata: unknown;
};

type DbRuleAudit = {
  id: string;
  rule_id: string;
  workflow_id: string | null;
  resource: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  status: "allowed" | "warning" | "blocked";
  message: string | null;
  detail: unknown;
  created_at: string;
};

export async function listRules(): Promise<AppRule[]> {
  const { data, error } = await supabase
    .from("app_rules")
    .select(
      `
      id,
      slug,
      name,
      description,
      resource,
      trigger,
      severity,
      is_enabled,
      created_by,
      created_at,
      updated_at,
      app_rule_conditions (*),
      app_rule_actions (*),
      app_rule_targets (*)
    `,
    )
    .order("name", { ascending: true });

  if (error) {
    logger.error("Failed to fetch rules", { error, tags: ["error"] });
    return [];
  }

  return (data as DbRule[]).map(mapRule);
}

export async function getRuleBySlug(slug: string): Promise<AppRule | null> {
  const { data, error } = await supabase
    .from("app_rules")
    .select(
      `
      id,
      slug,
      name,
      description,
      resource,
      trigger,
      severity,
      is_enabled,
      created_by,
      created_at,
      updated_at,
      app_rule_conditions (*),
      app_rule_actions (*),
      app_rule_targets (*)
    `,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch rule", { error, tags: ["error"] });
    return null;
  }

  return data ? mapRule(data as DbRule) : null;
}

export async function listRuleAudits(
  ruleId: string,
  limit = 50,
): Promise<RuleAuditEntry[]> {
  const { data, error } = await supabase
    .from("app_rule_audits")
    .select("*")
    .eq("rule_id", ruleId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to fetch rule audits", { error, tags: ["error"] });
    return [];
  }

  return (data as DbRuleAudit[]).map(mapAudit);
}

function mapRule(rule: DbRule): AppRule {
  return {
    id: rule.id,
    slug: rule.slug,
    name: rule.name,
    description: rule.description ?? undefined,
    resource: rule.resource,
    trigger: rule.trigger,
    severity: rule.severity as AppRule["severity"],
    isEnabled: rule.is_enabled,
    createdBy: rule.created_by ?? undefined,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
    conditions: (rule.app_rule_conditions ?? []).map(mapCondition),
    actions: (rule.app_rule_actions ?? []).map(mapAction),
    targets: (rule.app_rule_targets ?? []).map(mapTarget),
  };
}

function mapCondition(condition: DbRuleCondition): RuleCondition {
  return {
    id: condition.id,
    groupIndex: condition.group_index,
    conditionIndex: condition.condition_index,
    conjunction: condition.conjunction,
    field: condition.field,
    operator: condition.operator,
    value: condition.value ?? undefined,
  };
}

function mapAction(action: DbRuleAction): RuleAction {
  return {
    id: action.id,
    actionType: action.action_type,
    config:
      action.config && typeof action.config === "object"
        ? (action.config as Record<string, unknown>)
        : undefined,
    displayOrder: action.display_order,
  };
}

function mapTarget(target: DbRuleTarget): RuleTarget {
  return {
    id: target.id,
    targetType: target.target_type,
    targetId: target.target_id ?? undefined,
    metadata:
      target.metadata && typeof target.metadata === "object"
        ? (target.metadata as Record<string, unknown>)
        : undefined,
  };
}

function mapAudit(audit: DbRuleAudit): RuleAuditEntry {
  return {
    id: audit.id,
    ruleId: audit.rule_id,
    workflowId: audit.workflow_id ?? undefined,
    resource: audit.resource,
    action: audit.action,
    actorId: audit.actor_id ?? undefined,
    actorRole: audit.actor_role ?? undefined,
    status: audit.status,
    message: audit.message ?? undefined,
    detail:
      audit.detail && typeof audit.detail === "object"
        ? (audit.detail as Record<string, unknown>)
        : undefined,
    createdAt: audit.created_at,
  };
}
