"use client";

import { HrReadinessPanel } from "./HrReadinessPanel";

const SAMPLE = {
  employeeCount: 4,
  activeEmployeeCount: 3,
  incompleteProfiles: 1,
  missingDepartments: 0,
  missingAvailability: 2,
  missingCertifications: 1,
  lowReliability: 0,
};

export function HrReadinessPreview() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <HrReadinessPanel
        companyId="preview"
        employees={[]}
        canManageEmployees
        preview={SAMPLE}
        onOpenInvite={() => undefined}
      />
    </div>
  );
}
