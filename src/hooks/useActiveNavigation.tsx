import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { NavigationSection, NavigationItem } from './useNavigationStructure';

export interface ProcessedNavigationItem extends NavigationItem {
  isActive: boolean;
}

export interface ProcessedNavigationSection extends Omit<NavigationSection, 'items'> {
  items: ProcessedNavigationItem[];
}

export function useActiveNavigation(navigationStructure: NavigationSection[]) {
  const location = useLocation();

  const getIsActive = (path: string) => location.pathname === path;

  const processedSections: ProcessedNavigationSection[] = useMemo(() => {
    return navigationStructure.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        isActive: getIsActive(item.href),
      })),
    }));
  }, [navigationStructure, location.pathname]);

  return {
    processedSections,
    getIsActive,
  };
}