import { useMemo } from 'react';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags, getFeatureFlag } from '@/config/featureFlags';

// Hook to access feature flags throughout the application
export function useFeatureFlags() {
  const flags = useMemo(() => {
    // In the future, this could be enhanced to:
    // 1. Fetch user-specific or company-specific feature flags from the server
    // 2. Merge with environment-based flags
    // 3. Support runtime toggles for admins
    
    return DEFAULT_FEATURE_FLAGS;
  }, []);

  const isEnabled = useMemo(() => {
    return (path: string) => getFeatureFlag(flags, path);
  }, [flags]);

  return {
    ...flags,
    isEnabled,
  };
}

// Convenience hook for checking a single feature flag
export function useFeatureFlag(path: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(path);
}