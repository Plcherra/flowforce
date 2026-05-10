import { useMemo, useCallback } from "react";
import { useLocation } from "@/lib/router-adapter";
import { NavigationSection, NavigationItem } from "./useNavigationStructure";

export interface ProcessedNavigationItem extends NavigationItem {
  isActive: boolean;
}

export interface ProcessedNavigationSection
  extends Omit<NavigationSection, "items"> {
  items: ProcessedNavigationItem[];
}

const normalizeNavigationPath = (path: string) => {
  if (!path) {
    return "/app";
  }

  let normalized = path.startsWith("/") ? path : `/${path}`;

  if (!normalized.startsWith("/app")) {
    normalized = normalized === "/" ? "/app" : `/app${normalized}`;
  }

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
};

export function useActiveNavigation(navigationStructure: NavigationSection[]) {
  const location = useLocation();

  const getIsActive = useCallback(
    (path: string) => {
      const normalizedPath = normalizeNavigationPath(path);
      const current = normalizeNavigationPath(location.pathname);

      if (current === normalizedPath) {
        return true;
      }

      return current.startsWith(`${normalizedPath}/`);
    },
    [location.pathname],
  );

  const processedSections: ProcessedNavigationSection[] = useMemo(() => {
    return navigationStructure.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        href: normalizeNavigationPath(item.href),
        isActive: getIsActive(item.href),
      })),
    }));
  }, [navigationStructure, getIsActive]);

  return {
    processedSections,
    getIsActive,
  };
}
