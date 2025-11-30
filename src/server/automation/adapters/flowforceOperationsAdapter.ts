import type { AutomationScript } from '../validateScript';
import { appEnv } from '@/lib/env';

type DispatchResult = {
  dispatched: boolean;
  endpoint?: string;
};

export async function dispatchAutomationToFlowForce(script: AutomationScript): Promise<DispatchResult> {
  const endpoint = appEnv.VITE_FLOWFORCE_AUTOMATIONS_ENDPOINT;
  if (!endpoint) {
    console.info('[FlowForceAdapter] no endpoint configured, skipping dispatch');
    return { dispatched: false };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ script }),
  });

  if (!response.ok) {
    throw new Error(`FlowForce adapter failed (${response.status})`);
  }

  return { dispatched: true, endpoint };
}
