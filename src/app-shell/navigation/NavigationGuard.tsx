import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "@/lib/router-adapter";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-states";

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
  const currentPath = location.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    currentPath.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => currentPath.startsWith(route));

  const redirectTo = useCallback(
    (destination: string, state?: Record<string, unknown>) => {
      if (currentPath === destination) return;
      navigate(destination, { replace: true, state });
    },
    [currentPath, navigate],
  );

  useEffect(() => {
    if (loading) return; // Wait for auth to resolve

    // Redirect authenticated users away from auth pages
    if (user && isAuthRoute) {
      redirectTo("/app/dashboard");
      return;
    }

    // Redirect unauthenticated users from protected routes
    if (!user && isProtectedRoute) {
      redirectTo("/auth", { from: currentPath });
      return;
    }

    // Auto-redirect root path for authenticated users
    if (user && currentPath === "/") {
      redirectTo("/app/dashboard");
      return;
    }
  }, [user, loading, currentPath, isProtectedRoute, isAuthRoute, redirectTo]);

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
