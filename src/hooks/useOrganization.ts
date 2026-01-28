import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompany, getDemoCompany, type Company } from "@/hooks/useCompany";

export interface UseOrganizationResult {
  organization: Company;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  usingFallback: boolean;
  hasUserContext: boolean;
}

export function useOrganization(): UseOrganizationResult {
  const { user, loading: authLoading } = useAuth();
  const companyState = useCompany();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const organization = companyState.company ?? getDemoCompany(user?.id);
  const usingFallback = !companyState.company;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await companyState.refetchCompany();
      setRefreshError(null);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to refresh organization.";
      setRefreshError(message);
    } finally {
      setRefreshing(false);
    }
  };

  const loading = Boolean(authLoading || companyState.loading || refreshing);
  const error =
    refreshError ??
    (!authLoading && !user ? "Sign in to load your organization." : null);

  return {
    organization,
    loading,
    error,
    refresh,
    usingFallback,
    hasUserContext: Boolean(user),
  };
}
