import type { CopilotActionPayload, CopilotContext } from './CopilotDTO';

export interface PolicyDecision {
  allowed: boolean;
  reasons?: string[];
  missingRoles?: string[];
}

export interface PolicyEngineOptions {
  actionRoleMap?: Record<string, string[]>;
  defaultAllowRoles?: string[];
}

const DEFAULT_ACTION_ROLE_MAP: Record<string, string[]> = {
  'task.create': ['manager', 'owner', 'company_admin', 'admin'],
  'task.update': ['manager', 'owner', 'company_admin', 'admin'],
  'schedule.update': ['scheduler', 'manager', 'owner', 'company_admin'],
  'schedule.publish': ['scheduler', 'manager', 'owner', 'company_admin'],
  'webhook.dispatch': ['owner', 'company_admin', 'admin'],
  'recognition.award': ['manager', 'owner', 'company_admin', 'hr_admin'],
  'idea.action.create': ['analyst', 'manager', 'owner', 'company_admin'],
  'idea.action.complete': ['analyst', 'manager', 'owner', 'company_admin'],
  'scenario.apply': ['analyst', 'manager', 'owner', 'company_admin'],
};

const DEFAULT_ALLOW_ROLES = ['manager', 'admin', 'company_admin', 'owner'];

const normalize = (value: string) => value.trim().toLowerCase();

export class PolicyEngine {
  private readonly actionRoleMap: Record<string, string[]>;
  private readonly defaultAllowRoles: string[];

  constructor(options: PolicyEngineOptions = {}) {
    this.actionRoleMap = Object.fromEntries(
      Object.entries({ ...DEFAULT_ACTION_ROLE_MAP, ...(options.actionRoleMap ?? {}) }).map(
        ([key, roles]) => [normalize(key), roles.map(normalize)],
      ),
    );
    this.defaultAllowRoles = (options.defaultAllowRoles ?? DEFAULT_ALLOW_ROLES).map(normalize);
  }

  async evaluateAction(context: CopilotContext, action: CopilotActionPayload): Promise<PolicyDecision> {
    const reasons: string[] = [];

    if (!action.companyId || !action.dedupeKey) {
      reasons.push('Action missing required tenancy metadata.');
    }

    if (action.companyId !== context.companyId) {
      reasons.push('Action company mismatch.');
    }

    if (context.actor.companyId !== context.companyId) {
      reasons.push('Actor not scoped to company context.');
    }

    if (action.actorUserId !== context.actor.userId) {
      reasons.push('Actor mismatch for requested action.');
    }

    if (this.isExplicitlyDenied(context, action)) {
      reasons.push('Policy override denies this action type.');
    }

    const actorRoles = (context.actor.roles ?? []).map(normalize);
    if (actorRoles.length === 0) {
      reasons.push('Actor has no assigned roles.');
    }

    const requiredRoles = this.resolveRequiredRoles(action);
    const missingRoles = requiredRoles.filter((role) => !actorRoles.includes(role));
    if (missingRoles.length > 0) {
      reasons.push('Actor lacks required role.');
    }

    if (reasons.length === 0) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reasons,
      missingRoles: missingRoles.length > 0 ? missingRoles : undefined,
    };
  }

  async filterPermitted(context: CopilotContext, actions: CopilotActionPayload[]) {
    const permitted: CopilotActionPayload[] = [];
    const denied: Array<{ action: CopilotActionPayload; decision: PolicyDecision }> = [];

    for (const action of actions) {
      const decision = await this.evaluateAction(context, action);
      if (decision.allowed) {
        permitted.push(action);
      } else {
        denied.push({ action, decision });
      }
    }

    return { permitted, denied };
  }

  private resolveRequiredRoles(action: CopilotActionPayload): string[] {
    const fromMetadata = this.extractRequiredRolesFromMetadata(action);
    if (fromMetadata.length > 0) {
      return fromMetadata;
    }

    const normalizedType = normalize(action.actionType);
    if (this.actionRoleMap[normalizedType]) {
      return this.actionRoleMap[normalizedType];
    }

    const groupKey = normalizedType.split('.')[0];
    if (groupKey && this.actionRoleMap[groupKey]) {
      return this.actionRoleMap[groupKey];
    }

    return this.defaultAllowRoles;
  }

  private extractRequiredRolesFromMetadata(action: CopilotActionPayload): string[] {
    const required = (action.metadata as Record<string, unknown> | undefined)?.requiredRoles;
    if (!required) {
      return [];
    }

    if (Array.isArray(required)) {
      return (required as string[]).map(normalize);
    }

    if (typeof required === 'string') {
      return required
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean)
        .map(normalize);
    }

    return [];
  }

  private isExplicitlyDenied(context: CopilotContext, action: CopilotActionPayload): boolean {
    const denyList = context.policyOverrides?.deny ?? [];
    return denyList.map(normalize).includes(normalize(action.actionType));
  }
}

export default PolicyEngine;
