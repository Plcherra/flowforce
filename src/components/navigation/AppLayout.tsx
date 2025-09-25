import { useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { useRoutePreloader } from '@/hooks/useRoutePreloader';
import { useNavigationAnalytics } from '@/hooks/useNavigationAnalytics';
import { NavigationGuard } from '@/components/navigation/NavigationGuard';
import { RouteLoadingBoundary } from '@/components/navigation/RouteLoadingBoundary';

export function AppLayout() {
  // These hooks now run INSIDE the router context
  useRoutePreloader();
  useNavigationAnalytics();

  return (
    <NavigationGuard>
      <RouteLoadingBoundary>
        <Outlet />
        <ScrollRestoration />
      </RouteLoadingBoundary>
    </NavigationGuard>
  );
}