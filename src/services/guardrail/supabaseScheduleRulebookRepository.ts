import { supabase } from '@/integrations/supabase/client';
import type { ScheduleRulebook, RulebookStep, RulebookConstraint } from '@/types/scheduleRulebook';

type DbRulebook = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string;
  owner_role: string;
  last_updated_at: string;
  schedule_rulebook_steps: DbRulebookStep[];
  schedule_rulebook_constraints: DbRulebookConstraint[];
};

type DbRulebookStep = {
  id: string;
  slug: string;
  title: string;
  purpose: string | null;
  mode: 'manual' | 'assisted' | 'automated';
  display_order: number;
  allowed_roles: string[];
  schedule_rulebook_step_criteria: DbStepCriterion[];
  schedule_rulebook_step_blockers: DbStepBlocker[];
  schedule_rulebook_step_followups: DbStepFollowUp[];
};

type DbStepCriterion = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  evidence_type: StepEvidenceType;
  target_value: number | null;
  approver_role: string | null;
  data_source: string | null;
  display_order: number;
};

type StepEvidenceType = 'checkbox' | 'numeric' | 'document' | 'approval' | 'external';

type DbStepBlocker = {
  id: string;
  message: string;
  actions: string[];
  severity: 'blocking' | 'warning';
};

type DbStepFollowUp = {
  id: string;
  description: string;
  automation_key: string | null;
  notify_roles: string[] | null;
};

type DbRulebookConstraint = {
  id: string;
  slug: string;
  label: string;
  description: string;
  scope: 'global' | 'action';
  actions: string[] | null;
  validator_key: string;
  severity: 'warning' | 'blocking';
};

export async function fetchRulebookFromSupabase(identifier: string): Promise<ScheduleRulebook | null> {
  const query = supabase
    .from('schedule_rulebooks')
    .select(
      `
        id,
        slug,
        name,
        description,
        version,
        owner_role,
        last_updated_at,
        schedule_rulebook_steps (
          id,
          slug,
          title,
          purpose,
          mode,
          display_order,
          allowed_roles,
          schedule_rulebook_step_criteria (
            id,
            slug,
            label,
            description,
            evidence_type,
            target_value,
            approver_role,
            data_source,
            display_order
          ),
          schedule_rulebook_step_blockers (
            id,
            message,
            actions,
            severity
          ),
          schedule_rulebook_step_followups (
            id,
            description,
            automation_key,
            notify_roles
          )
        ),
        schedule_rulebook_constraints (
          id,
          slug,
          label,
          description,
          scope,
          actions,
          validator_key,
          severity
        )
      `
    )
    .eq('slug', identifier)
    .maybeSingle();

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch rulebook', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapRulebook(data as DbRulebook);
}

function mapRulebook(rulebook: DbRulebook): ScheduleRulebook {
  const steps: RulebookStep[] = [...(rulebook.schedule_rulebook_steps || [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((step) => ({
      id: step.slug,
      recordId: step.id,
      title: step.title,
      purpose: step.purpose ?? '',
      mode: step.mode,
      allowedRoles: step.allowed_roles,
      completionCriteria: [...(step.schedule_rulebook_step_criteria || [])]
        .sort((a, b) => a.display_order - b.display_order)
        .map((criterion) => ({
          id: criterion.slug,
          recordId: criterion.id,
          label: criterion.label,
          description: criterion.description ?? undefined,
          evidenceType: criterion.evidence_type,
          targetValue: criterion.target_value ?? undefined,
          approverRole: criterion.approver_role ?? undefined,
          dataSource: criterion.data_source ?? undefined,
        })),
      blockers: (step.schedule_rulebook_step_blockers || []).map((blocker) => ({
        id: blocker.id,
        recordId: blocker.id,
        message: blocker.message,
        actions: blocker.actions,
        severity: blocker.severity,
      })),
      followUps: (step.schedule_rulebook_step_followups || []).map((followUp) => ({
        id: followUp.id,
        recordId: followUp.id,
        description: followUp.description,
        automationKey: followUp.automation_key ?? undefined,
        notifyRoles: followUp.notify_roles ?? undefined,
      })),
    }));

  const constraints: RulebookConstraint[] = (rulebook.schedule_rulebook_constraints || []).map((constraint) => ({
    id: constraint.slug,
    recordId: constraint.id,
    label: constraint.label,
    description: constraint.description,
    scope: constraint.scope,
    actions: constraint.actions ?? undefined,
    validatorKey: constraint.validator_key,
    severity: constraint.severity,
  }));

  return {
    id: rulebook.id,
    name: rulebook.name,
    description: rulebook.description ?? undefined,
    version: rulebook.version,
    ownerRole: rulebook.owner_role,
    lastUpdated: rulebook.last_updated_at,
    steps,
    constraints,
  };
}
