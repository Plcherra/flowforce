"use client";

import { useState } from "react";
import { useCan } from "@/hooks/useCan";
import { useEmployees } from "@/hooks/useEmployees";
import { usePackFlag } from "@/hooks/usePackFlags";
import { useProfile } from "@/hooks/useProfile";
import { HrReadinessPanel } from "@/features/employees/components/HrReadinessPanel";
import { InviteEmployeeDialog } from "@/features/employees/components/InviteEmployeeDialog";

export function InsightsHrReadiness() {
  const enabled = usePackFlag("insights");
  const { profile } = useProfile();
  const { can } = useCan();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const { employees, loading } = useEmployees({ includeInactive: true, companyId });
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!enabled) return null;

  return (
    <div data-testid="insights-hr-readiness">
      <HrReadinessPanel
        companyId={companyId}
        employees={employees}
        loading={loading}
        canManageEmployees={can("manageUsers")}
        onOpenInvite={() => setInviteOpen(true)}
      />
      <InviteEmployeeDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
