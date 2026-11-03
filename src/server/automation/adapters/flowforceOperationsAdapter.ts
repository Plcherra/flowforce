export async function dispatchAutomationToFlowForce(): Promise<never> {
  throw new Error(
    "Automation scripts run through POST /api/ops/automations/run.",
  );
}
