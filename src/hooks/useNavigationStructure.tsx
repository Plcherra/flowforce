import { useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useCan } from '@/hooks/useCan';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useCustomSections } from '@/hooks/useCustomSections';
import { navigationSections } from '@/data/navigationData';
import { getNavByCategory } from '@/sections/registry';

export interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: any;
  translationKey?: string;
}

export interface NavigationSection {
  id: string;
  title: string;
  translationKey: string;
  items: NavigationItem[];
}

export function useNavigationStructure() {
  const { hasRole } = usePermissions();
  const { can } = useCan();
  const featureFlags = useFeatureFlags();
  const { sections: customSections } = useCustomSections();

  const isItemVisible = (item: any) => {
    if (item.roles && !hasRole(item.roles)) return false;
    if (item.permission && !can(item.permission as any)) return false;
    if (item.featureFlag && !featureFlags.isEnabled(item.featureFlag)) return false;
    return true;
  };

  const isSectionVisible = (section: any) => {
    if (section.roles && !hasRole(section.roles)) return false;
    if (section.permission && !can(section.permission as any)) return false;
    return section.items.some((item: any) => isItemVisible(item));
  };

  // Filter and deduplicate custom sections
  const getFilteredCustomSections = (categoryKey: string) => {
    return customSections
      .filter(customSection => 
        customSection.category === categoryKey && 
        customSection.is_active
      )
      // Remove unwanted sections
      .filter(cs => {
        const path = (cs.path || '').toLowerCase();
        const name = (cs.name || '').toLowerCase();
        return !path.includes('/help-desk') && 
               !name.includes('simple inventory') &&
               !name.includes('events') && 
               !name.includes('calendar');
      })
      // Deduplicate by path
      .reduce((unique: any[], curr) => {
        const exists = unique.some(u => 
          (u.path || '').toLowerCase() === (curr.path || '').toLowerCase()
        );
        return exists ? unique : [...unique, curr];
      }, []);
  };

  // Filter file-based sections to avoid duplicates
  const getFilteredFileSections = (categoryKey: string, existingPaths: Set<string>) => {
    const dynamic = getNavByCategory()[categoryKey] || [];
    const customSlugs = new Set(
      customSections.map(cs => (cs.path || '').replace(/^\//, '').split('/')[0])
    );
    
    return dynamic.filter((it) => {
      const slug = (it.href || '').split('/')[2] || '';
      const path = (it.href || '').replace(/^\//, '').split('/')[0];
      const itemName = (it.name || '').toLowerCase();
      
      return !customSlugs.has(slug) && 
             !existingPaths.has(path) &&
             !itemName.includes('simple inventory') && 
             !itemName.includes('events') && 
             !itemName.includes('calendar');
    });
  };

  const navigationStructure: NavigationSection[] = useMemo(() => {
    return navigationSections
      .filter(section => isSectionVisible(section))
      .map(section => {
        // Process static navigation items
        const staticItems: NavigationItem[] = section.items
          .filter(item => isItemVisible(item))
          .map(item => ({
            id: `static-${item.href}`,
            name: item.name,
            href: item.href,
            icon: item.icon,
            translationKey: item.translationKey,
          }));

        // Get canonical paths to avoid duplicates
        const canonicalPaths = new Set(
          section.items.map(item => item.href.replace(/^\//, '').split('/')[0])
        );

        // Process custom sections
        const customItems: NavigationItem[] = getFilteredCustomSections(section.translationKey)
          .map(customSection => ({
            id: `custom-${customSection.id}`,
            name: customSection.name || 'Unnamed Section',
            href: `/section${customSection.path}`,
            icon: customSection.icon,
          }));

        // Process file-based sections
        const fileItems: NavigationItem[] = getFilteredFileSections(section.translationKey, canonicalPaths)
          .map(fileSection => ({
            id: `file-${fileSection.href}`,
            name: fileSection.name,
            href: fileSection.href,
            icon: fileSection.icon,
          }));

        return {
          id: section.translationKey,
          title: section.title,
          translationKey: section.translationKey,
          items: [...staticItems, ...customItems, ...fileItems],
        };
      })
      .filter(section => section.items.length > 0); // Only include sections with visible items
  }, [customSections, hasRole, can, featureFlags]);

  const canManageSections = can('systemSettings') || hasRole(['company_admin', 'owner', 'admin']);

  return {
    navigationStructure,
    canManageSections,
  };
}