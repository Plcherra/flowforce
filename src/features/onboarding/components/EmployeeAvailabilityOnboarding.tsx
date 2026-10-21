import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { isManagerLikeRole } from "@/utils/authRoles";
import { EmployeeFixedAvailabilityStep } from "@/features/onboarding/components/EmployeeFixedAvailabilityStep";

export function EmployeeAvailabilityOnboarding() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const employeeId = profile?.id ?? null;
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const isManager = isManagerLikeRole(profile?.role);

  const gateQuery = useQuery({
    queryKey: ["employee-fixed-availability-onboarding", employeeId, companyId],
    enabled: Boolean(employeeId && companyId) && !isManager,
    queryFn: async () => {
      const { data: prefs, error: prefsError } = await supabase
        .from("org_prefs")
        .select("availability_choice")
        .eq("id", companyId!)
        .maybeSingle();
      if (prefsError) throw prefsError;
      if (prefs?.availability_choice !== "fixed") return false;

      const { data: existing, error } = await supabase
        .from("availability_request")
        .select("id")
        .eq("employee_id", employeeId!)
        .limit(1);
      if (error) throw error;
      return (existing ?? []).length === 0;
    },
  });

  if (!gateQuery.data || !employeeId || !companyId) return null;

  return (
    <EmployeeFixedAvailabilityStep
      employeeId={employeeId}
      companyId={companyId}
      onSent={() => {
        void queryClient.invalidateQueries({
          queryKey: ["employee-fixed-availability-onboarding", employeeId, companyId],
        });
      }}
    />
  );
}
