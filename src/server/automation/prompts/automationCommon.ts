export interface AutomationPromptContext {
  issueTitle: string;
  issueDescription?: string | null;
  severity?: string | null;
  kpiKey?: string | null;
}

export function serializeAutomationContext(context: AutomationPromptContext): string {
  return `Issue: ${context.issueTitle}
Severity: ${context.severity ?? 'unknown'}
KPI: ${context.kpiKey ?? 'n/a'}
Details: ${context.issueDescription ?? 'n/a'}`;
}
