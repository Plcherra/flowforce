'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ErrorBoundary from '@/components/ui/error-boundary';
import { appEnv } from '@/lib/env';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
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
