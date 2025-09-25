// src/lib/copilot/usePolicy.ts
// Lightweight policy hook to check Co-Pilot decisions from the UI.
// NOTE: This file is .ts (not .tsx). Avoid JSX to keep module resolution simple.

import React, { useEffect, useMemo, useState } from 'react';
import type { UserIdentity } from '@/lib/auth/acl';

export type PolicyAction =
  | 'schedule.assign'
  | 'schedule.publish'
  | 'availability.approve'
  | 'prep.create_task'
  | 'prep.complete_task'
  | 'inventory.update_counts'
  | 'rules.manage'
  | 'onboarding.assign_training';

export interface PolicyPayload {
  locationId?: string;
  date?: string; // ISO date for schedule actions
  roleId?: string;
  area?: 'FOH' | 'BOH';
  [key: string]: any;
}

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
  fixes?: { label: string; payload?: any }[];
}

export interface UsePolicyResult extends PolicyDecision {
  loading: boolean;
  recheck: () => void;
}

// Try backend policy API
async function requestDecision(action: PolicyAction, payload: PolicyPayload): Promise<PolicyDecision | null> {
  try {
    const res = await fetch('/api/policy/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.allowed === 'boolean') {
      return { allowed: data.allowed, reasons: data.reasons ?? [], fixes: data.fixes ?? [] };
    }
    return null;
  } catch {
    return null;
  }
}

// Fallback local simulation
function simulateDecision(action: PolicyAction, payload: PolicyPayload): PolicyDecision {
  if (action === 'schedule.publish' && !payload?.date) {
    return { allowed: false, reasons: ['Missing schedule date'], fixes: [] };
  }
  if (action === 'inventory.update_counts' && !payload?.locationId) {
    return { allowed: false, reasons: ['Missing locationId'], fixes: [] };
  }
  return { allowed: true, reasons: [] };
}

// React hook
export function usePolicy(
  user: UserIdentity | null | undefined,
  action: PolicyAction,
  payload: PolicyPayload
): UsePolicyResult {
  const [decision, setDecision] = useState<PolicyDecision>({ allowed: false, reasons: ['Checking policy...'] });
  const [loading, setLoading] = useState(true);

  const stablePayload = useMemo(() => JSON.stringify(payload ?? {}), [payload]);

  const recheck = () => {
    setLoading(true);
    requestDecision(action, payload).then((serverDecision) => {
      const d = serverDecision ?? simulateDecision(action, payload);
      setDecision(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    recheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, stablePayload]);

  return { ...decision, loading, recheck };
}

// --- UI helpers implemented without JSX so this file can remain .ts ---

export function PolicyGate({
  user,
  action,
  payload,
  children,
  fallback,
}: {
  user: UserIdentity | null | undefined;
  action: PolicyAction;
  payload: PolicyPayload;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { allowed } = usePolicy(user, action, payload);
  return allowed
    ? React.createElement(React.Fragment, null, children)
    : React.createElement(React.Fragment, null, fallback ?? null);
}

export function WithPolicyButton({
  user,
  action,
  payload,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  user: UserIdentity | null | undefined;
  action: PolicyAction;
  payload: PolicyPayload;
}) {
  const { allowed, reasons, loading } = usePolicy(user, action, payload);
  const title = !allowed ? (reasons && reasons.length > 0 ? reasons[0] : 'Action blocked by policy') : undefined;
  return React.createElement('button', {
    ...rest,
    disabled: Boolean(disabled) || loading || !allowed,
    title,
    children,
  });
}