import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';
import { OPERATIONS_AUTOMATION_SYSTEM_PROMPT } from '@/server/automation/prompts/operations';
import { serializeAutomationContext } from '@/server/automation/prompts/automationCommon';
import { validateAutomationScript, type AutomationScript } from '@/server/automation/validateScript';
import { appEnv } from '@/lib/env';

const apiKey = appEnv.VITE_OPENAI_API_KEY;
const openai = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  : null;

export interface GenerateAutomationSuggestionInput {
  issueId: string;
  orgId: string;
}

export async function generateAutomationSuggestion({ issueId, orgId }: GenerateAutomationSuggestionInput) {
  if (!openai) {
    throw new Error('OpenAI key missing');
  }

  const { data: issue, error } = await supabase
    .from('ops_issues')
    .select('*')
    .eq('id', issueId)
    .eq('org_id', orgId)
    .single();

  if (error || !issue) {
    throw new Error('Issue not found');
  }

  const context = serializeAutomationContext({
    issueTitle: issue.title,
    issueDescription: issue.description,
    severity: issue.severity,
    kpiKey: issue.kpi_key,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: OPERATIONS_AUTOMATION_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Design an automation for the following context and return JSON only.\n${context}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? '{}';
  let parsed: AutomationScript | null = null;
  try {
    parsed = JSON.parse(text) as AutomationScript;
  } catch (parseError) {
    console.error('[generateAutomationSuggestion] invalid JSON', parseError, text);
    throw new Error('Automation generator returned invalid JSON');
  }

  if (!validateAutomationScript(parsed)) {
    throw new Error('Generated script failed schema validation');
  }

  const { data: suggestion, error: insertError } = await supabase
    .from('ops_automation_suggestions')
    .insert({
      org_id: orgId,
      issue_id: issueId,
      suggestion_title: issue.title,
      suggestion_summary: `Automation for ${issue.issue_type ?? 'ops'} (${issue.severity ?? 'normal'})`,
      script: parsed,
      status: 'pending',
    })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    suggestionId: suggestion.id,
    status: suggestion.status,
    script: parsed as AutomationScript,
  };
}
