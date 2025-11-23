import { supabaseAdmin } from "../../supabaseAdmin.js";

export interface CreateIssueInput {
  orgId: string;
  kpiKey?: string;
  issueType: string;
  title: string;
  description?: string;
  severity?: string;
  metadata?: Record<string, unknown>;
}

export async function createIssue(input: CreateIssueInput) {
  const { orgId, kpiKey, issueType, title, description, severity = 'warning', metadata } = input;
  const payload = {
    org_id: orgId,
    kpi_key: kpiKey ?? null,
    issue_type: issueType,
    title,
    description: description ?? null,
    severity,
    source: metadata ?? {},
  };

  const { data, error } = await supabaseAdmin.from('ops_issues').insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  return data;
}
