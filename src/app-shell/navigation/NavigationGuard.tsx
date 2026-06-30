import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "@/lib/router-adapter";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { buildMobileAuthRedirectPath } from "@/services/mobile/mobileAuthRouting";

interface NavigationGuardProps {
  children: React.ReactNode;
}

// Define routes that require authentication
const protectedRoutes = ["/app"];
const authRoutes = ["/auth", "/register"];

export function NavigationGuard({ children }: NavigationGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const currentPath = location.pathname;
  const currentTarget = `${location.pathname}${location.search}`;
  const isProtectedRoute = protectedRoutes.some((route) =>
    currentPath.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => currentPath.startsWith(route));

  const redirectTo = useCallback(
    (destination: string, state?: Record<string, unknown>) => {
      const destinationPath = destination.split("?")[0] ?? destination;
      const currentSearch = location.search;
      const destinationSearch = destination.includes("?")
        ? `?${destination.split("?")[1]}`
        : "";

      if (
        currentPath === destinationPath &&
        currentSearch === destinationSearch
      ) {
        return;
      }

      navigate(destination, { replace: true, state });
    },
    [currentPath, location.search, navigate],
  );

  useEffect(() => {
    if (loading) return; // Wait for auth to resolve

    // Redirect authenticated users away from auth pages
    if (userId && isAuthRoute) {
      redirectTo("/app/dashboard");
      return;
    }

    // Redirect unauthenticated users from protected routes
    if (!userId && isProtectedRoute) {
      redirectTo(buildMobileAuthRedirectPath(currentPath, location.search), {
        from: currentTarget,
      });
      return;
    }

    // Auto-redirect root path for authenticated users
    if (userId && currentPath === "/") {
      redirectTo("/app/dashboard");
      return;
    }
  }, [
    userId,
    loading,
    currentPath,
    currentTarget,
    location.search,
    isProtectedRoute,
    isAuthRoute,
    redirectTo,
  ]);

  if (loading && isProtectedRoute) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
          <LoadingSpinner text="Preparing your workspace..." />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
