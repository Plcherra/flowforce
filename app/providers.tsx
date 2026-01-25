'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ErrorBoundary from '@/components/ui/error-boundary';
import { appEnv } from '@/lib/env';
import { logger } from '@/utils/logger';
// Initialize i18next before using it
import '@/i18n/config';

export function Providers({ children }: { children: React.ReactNode }) {
  // Debug logging for dev
  useEffect(() => {
    if (appEnv.DEV) {
      logger.debug('Providers component mounted', { timestamp: new Date().toISOString() });
    }
  }, []);

  const [queryClient] = useState(
    () => {
      if (appEnv.DEV) {
        logger.debug('Creating QueryClient', { tags: ['react-query'] });
      }
      return new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      });
    },
  );

  return (
    <ErrorBoundary showDetails={appEnv.DEV}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProfileProvider>
            <LanguageProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </LanguageProvider>
          </ProfileProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
