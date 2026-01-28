// src/server/copilot/decision.ts
// Unified decision model for Co-Pilot policy checks.

export type Fix = { label: string; payload?: any };

export type Decision = {
  allow: boolean;
  reasons?: string[];
  fixes?: Fix[];
};

export function allow(): Decision {
  return { allow: true, reasons: [] };
}

export function deny(reason: string | string[], fixes?: Fix[]): Decision {
  return {
    allow: false,
    reasons: Array.isArray(reason) ? reason : [reason],
    fixes: fixes ?? [],
  };
}

/**
 * Combine multiple decisions:
 * - If any denies → deny with merged reasons/fixes.
 * - Otherwise allow.
 */
export function combine(decisions: Decision[]): Decision {
  const denied = decisions.filter((d) => !d.allow);
  if (denied.length > 0) {
    return {
      allow: false,
      reasons: denied.flatMap((d) => d.reasons ?? []),
      fixes: denied.flatMap((d) => d.fixes ?? []),
    };
  }
  return allow();
}
