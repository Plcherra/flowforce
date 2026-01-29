"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ErrorBoundary from "@/components/ui/error-boundary";
import { appEnv } from "@/lib/env";
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";
// Initialize i18next before using it
import "@/i18n/config";

export function Providers({ children }: { children: React.ReactNode }) {
  // Debug logging for dev
  useEffect(() => {
    if (appEnv.DEV) {
      logger.debug("Providers component mounted", {
        timestamp: new Date().toISOString(),
      });
    }

    // Global error handlers for unhandled promise rejections and errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error("Unhandled promise rejection", {
        error: event.reason,
        tags: ["unhandled-rejection"],
      });
      // Prevent default browser error logging in production
      if (!appEnv.DEV) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      logger.error("Unhandled error", {
        error: event.error || event.message,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        tags: ["unhandled-error"],
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  const [queryClient] = useState(() => {
    if (appEnv.DEV) {
      logger.debug("Creating QueryClient", { tags: ["react-query"] });
    }
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
          throwOnError: false, // Prevent unhandled promise rejections
        },
        mutations: {
          throwOnError: false, // Prevent unhandled promise rejections
        },
      },
    });
  });

  return (
    <ErrorBoundary showDetails={appEnv.DEV}>
      <QueryClientProvider client={queryClient}>
        <AuthStateCacheInvalidator />
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

/**
 * Component that listens to Supabase auth state changes and invalidates
 * React Query cache on sign in/out to prevent stale data.
 */
function AuthStateCacheInvalidator() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        logger.debug("Auth state changed, invalidating React Query cache", {
          event,
          hasSession: !!session,
          tags: ["auth", "react-query"],
        });

        // Invalidate all queries to ensure fresh data after auth change
        queryClient.invalidateQueries();
        
        // Optionally clear all queries completely for sign out
        if (event === "SIGNED_OUT") {
          queryClient.removeQueries();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return null;
}
