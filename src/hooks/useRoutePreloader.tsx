import { useEffect, useCallback } from "react";
import { useLocation } from "@/lib/router-adapter";

// Preload common routes the user is likely to visit
const routePreloadMap: Record<string, string[]> = {
  "/": ["/auth", "/register", "/features", "/templates", "/pricing"],
  "/auth": ["/app/dashboard", "/register"],
  "/register": ["/onboarding", "/company-registration"],
  "/app/dashboard": [
    "/app/messages",
    "/app/employees",
    "/app/calendar",
    "/app/settings",
  ],
  "/app/messages": ["/app/calendar", "/app/employees"],
  "/app/employees": ["/app/position-management"],
  "/templates": [
    "/templates/retail",
    "/templates/healthcare",
    "/templates/manufacturing",
  ],
};

export function useRoutePreloader() {
  const location = useLocation();

  // Enhanced preloading with visual feedback
  const preloadRoutes = useCallback((routes: string[]) => {
    routes.forEach((route, index) => {
      // Stagger preloading to avoid performance impact
      setTimeout(() => {
        // Use link prefetch to preload the route
        const existingLink = document.querySelector(`link[href="${route}"]`);
        if (!existingLink) {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.href = route;
          link.setAttribute("data-preloaded", "true");
          document.head.appendChild(link);
        }
      }, index * 100);
    });
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    const routesToPreload = routePreloadMap[currentPath] || [];

    if (routesToPreload.length > 0) {
      // Preload routes after a short delay to avoid impacting initial load
      const timeoutId = setTimeout(() => {
        preloadRoutes(routesToPreload);
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, preloadRoutes]);

  // Clean up old preload links periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const preloadLinks = document.querySelectorAll(
        'link[data-preloaded="true"]',
      );
      if (preloadLinks.length > 20) {
        // Remove oldest preload links if we have too many
        Array.from(preloadLinks)
          .slice(0, preloadLinks.length - 15)
          .forEach((link) => link.remove());
      }
    }, 30000);

    return () => clearInterval(cleanupInterval);
  }, []);
}
