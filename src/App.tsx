import { Suspense } from 'react';
import { RouterProvider, ScrollRestoration } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ErrorBoundary from '@/components/ui/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { router } from '@/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <div className="min-h-screen bg-background">
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center">
                    <LoadingSpinner text="Loading application..." />
                  </div>
                }>
                  <RouterProvider 
                    router={router}
                    fallbackElement={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner text="Loading page..." />
                      </div>
                    }
                  />
                </Suspense>
                <Toaster />
              </div>
            </TooltipProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;