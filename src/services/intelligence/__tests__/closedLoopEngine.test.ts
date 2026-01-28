import { describe, expect, it } from "vitest";
import {
  computeGuardrailEvidence,
  type ClosedLoopMetrics,
} from "@/services/intelligence/closedLoopEngine";

describe("computeGuardrailEvidence", () => {
  it("maps operational metrics into guardrail criteria and approvals", () => {
    const metrics: ClosedLoopMetrics = {
      pendingPto: 2,
      pendingShiftSwaps: 1,
      publishedShare: 0.75,
      coverageScore: 0.92,
      acknowledgmentRate: 0.9,
      laborTargetConfidence: 0.8,
      rosterUpdates: 3,
      complianceIncidents: 1,
      skillMixAlerts: 0,
      gmApprovalsPending: 0,
      autopilotTasksPending: 4,
      unresolvedCriticalEvents: 2,
      completedTasks: 6,
      resolvedEvents: 1,
    };

    const evidence = computeGuardrailEvidence(metrics);

    expect(evidence.completedCriteria["pto-reviewed"]).toBe(false);
    expect(evidence.pendingApprovals["pto-reviewed"]).toBe(false);

    expect(evidence.completedCriteria["labor-budget-loaded"]).toBe(
      metrics.laborTargetConfidence,
    );
    expect(evidence.completedCriteria["roster-updated"]).toBe(true);

    expect(evidence.completedCriteria["coverage-targets-met"]).toBe(
      metrics.coverageScore,
    );
    expect(evidence.completedCriteria["skill-mix-validated"]).toBe(true);
    expect(evidence.completedCriteria["compliance-check-passed"]).toBe(false);

    expect(evidence.pendingApprovals["gm-approval"]).toBe(true);
    expect(evidence.completedCriteria["gm-approval"]).toBe(true);

    expect(evidence.completedCriteria["swap-requests-addressed"]).toBe(false);

    expect(evidence.completedCriteria["schedule-published"]).toBe(
      metrics.publishedShare,
    );
    expect(evidence.completedCriteria["ack-rate"]).toBe(
      metrics.acknowledgmentRate,
    );
  });

  it("marks approvals complete when metrics show zero pendings", () => {
    const metrics: ClosedLoopMetrics = {
      pendingPto: 0,
      pendingShiftSwaps: 0,
      publishedShare: null,
      coverageScore: null,
      acknowledgmentRate: null,
      laborTargetConfidence: null,
      rosterUpdates: 0,
      complianceIncidents: 0,
      skillMixAlerts: 0,
      gmApprovalsPending: 0,
      autopilotTasksPending: 0,
      unresolvedCriticalEvents: 0,
      completedTasks: 0,
      resolvedEvents: 0,
    };

    const evidence = computeGuardrailEvidence(metrics);

    expect(evidence.completedCriteria["pto-reviewed"]).toBe(true);
    expect(evidence.pendingApprovals["pto-reviewed"]).toBe(true);
    expect(evidence.completedCriteria["swap-requests-addressed"]).toBe(true);
  });
});
