import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface NavigationGuardProps {
  children: React.ReactNode;
}

// Define routes that require authentication
const protectedRoutes = ['/app'];
const authRoutes = ['/auth', '/register'];

export function NavigationGuard({ children }: NavigationGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for auth to resolve

    const currentPath = location.pathname;
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    const isAuthRoute = authRoutes.some(route => currentPath.startsWith(route));

    // Redirect authenticated users away from auth pages
    if (user && isAuthRoute) {
      navigate('/app/dashboard', { replace: true });
      return;
    }

    // Redirect unauthenticated users from protected routes
    if (!user && isProtectedRoute) {
      navigate('/auth', { replace: true, state: { from: currentPath } });
      return;
    }

    // Auto-redirect root path for authenticated users
    if (user && currentPath === '/') {
      navigate('/app/dashboard', { replace: true });
      return;
    }
  }, [user, loading, location.pathname, navigate]);

  return <>{children}</>;
}