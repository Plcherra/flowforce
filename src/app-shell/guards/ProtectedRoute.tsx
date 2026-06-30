import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "@/lib/router-adapter";
import { useAuth } from "@/hooks/useAuth";
import { buildMobileAuthRedirectPath } from "@/services/mobile/mobileAuthRouting";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!loading && !userId) {
      navigate(
        buildMobileAuthRedirectPath(location.pathname, location.search),
        { replace: true },
      );
    }
  }, [userId, loading, navigate, location.pathname, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return <>{children}</>;
}
