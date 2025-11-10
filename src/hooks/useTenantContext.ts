import { useMemo } from 'react';
import { useAuth } from './useAuth';

type TenantContextOptions = {
  companyId?: string | null;
};

export function useTenantContext(options: TenantContextOptions = {}) {
  const { user } = useAuth();

  return useMemo(() => {
    const metadataCompanyId =
      typeof user?.user_metadata?.company_id === 'string' ? (user.user_metadata.company_id as string) : null;

    return {
      userId: user?.id ?? null,
      companyId: options.companyId ?? metadataCompanyId,
    };
  }, [user?.id, user?.user_metadata, options.companyId]);
}
