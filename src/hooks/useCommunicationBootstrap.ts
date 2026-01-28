import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmployees } from "@/hooks/useEmployees";

export interface CommunicationBootstrapOptions {
  includeInactiveEmployees?: boolean;
  companyId?: string | null;
}

export interface CommunicationBootstrapResult {
  loading: boolean;
  error: string | null;
  ready: boolean;
  userReady: boolean;
  organizationReady: boolean;
  employeesReady: boolean;
  organizationFallback: boolean;
  employeesFallback: boolean;
  organization: ReturnType<typeof useOrganization>["organization"];
  employees: ReturnType<typeof useEmployees>["employees"];
  refreshOrganization: () => Promise<void>;
  refetchEmployees: () => Promise<unknown>;
}

export function useCommunicationBootstrap(
  options: CommunicationBootstrapOptions = {},
): CommunicationBootstrapResult {
  const { includeInactiveEmployees = false, companyId } = options;
  const { user, loading: userLoading } = useAuth();
  const organizationState = useOrganization();
  const employeesState = useEmployees({
    includeInactive: includeInactiveEmployees,
    companyId: companyId ?? organizationState.organization?.id ?? null,
    enabled: Boolean(user?.id),
  });

  const loading = Boolean(
    userLoading || organizationState.loading || employeesState.loading,
  );
  const error = organizationState.error ?? employeesState.error ?? null;
  const employeesReady = !employeesState.loading;
  const ready = Boolean(user) && !loading && employeesReady;

  return {
    loading,
    error,
    ready,
    userReady: Boolean(user) && !userLoading,
    organizationReady: !organizationState.loading,
    employeesReady,
    organizationFallback: organizationState.usingFallback,
    employeesFallback: employeesState.usingFallbackData,
    organization: organizationState.organization,
    employees: employeesState.employees,
    refreshOrganization: organizationState.refresh,
    refetchEmployees: employeesState.refetchEmployees,
  };
}
