import React, { memo } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { useTranslation } from 'react-i18next';
import { NavigationItem } from './NavigationItem';
import { AddNewSectionButton } from '@/components/sidebar/AddNewSectionButton';
import { ProcessedNavigationSection } from '@/hooks/useNavigationData';

interface NavigationSectionProps {
  section: ProcessedNavigationSection;
  canManageSections: boolean;
}

const NavigationSectionComponent = ({ section, canManageSections }: NavigationSectionProps) => {
  const { state: sidebarState } = useSidebar();
  const { t } = useTranslation();
  const isCollapsed = sidebarState === 'collapsed';

  return (
    <SidebarGroup className="animate-fade-in">
      <SidebarGroupLabel 
        className={`text-xs font-semibold text-primary/80 uppercase tracking-wider px-3 py-2 mb-2 border border-primary/20 rounded-full bg-primary/5 transition-all duration-300 hover:bg-primary/10 hover:border-primary/30 ${
          isCollapsed ? 'hidden' : ''
        }`}
      >
        {t(`navigation.${section.translationKey}`)}
      </SidebarGroupLabel>
      
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {section.items.map((item, index) => (
            <div 
              key={item.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <NavigationItem item={item} />
            </div>
          ))}
        </SidebarMenu>

        {/* Add new section button for admins */}
        {canManageSections && !isCollapsed && (
          <div className="mt-2 animate-fade-in" style={{ animationDelay: `${section.items.length * 50}ms` }}>
            <AddNewSectionButton 
              category={t(`navigation.${section.translationKey}`)}
              categoryKey={section.translationKey}
            />
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export const NavigationSection = memo(NavigationSectionComponent);