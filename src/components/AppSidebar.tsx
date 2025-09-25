import React from 'react';
import { Building2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useNavigationData } from '@/hooks/useNavigationData';
import { NavigationSection } from '@/components/navigation/NavigationSection';
import { DashboardNavigation } from '@/components/navigation/DashboardNavigation';
import { useSidebarScroll } from '@/hooks/useSidebarScroll';

export function AppSidebar() {
  const { processedSections, canManageSections, getIsActive } = useNavigationData();
  const { scrollContainerRef } = useSidebarScroll();

  return (
    <Sidebar 
      collapsible="offcanvas"
      className="border-r border-primary/20 animate-fade-in animate-reduced-motion-safe"
    >
      <SidebarHeader className="p-4 border-b border-primary/20">
        {/* Company Logo/Brand with enhanced animation */}
        <div className="flex items-center justify-center mb-4 animate-fade-in">
          <div className="p-2 rounded-2xl bg-primary/20 border border-primary/30 hover-scale transition-all duration-300 hover:bg-primary/30 hover:border-primary/40 hover:shadow-lg">
            <Building2 className="h-6 w-6 text-primary transition-transform duration-200 hover:scale-110" />
          </div>
        </div>

        {/* Dashboard Navigation - More accessible position */}
        <DashboardNavigation isActive={getIsActive('/dashboard')} />
      </SidebarHeader>

      <SidebarContent 
        ref={scrollContainerRef}
        className="px-4 py-6 border-t border-primary/10 scroll-smooth overflow-y-auto"
        style={{ 
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--primary) / 0.3) transparent'
        }}
      >
        {/* Navigation Sections with staggered animation */}
        <div className="space-y-6">
          {processedSections.map((section, index) => (
            <div 
              key={section.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <NavigationSection 
                section={section} 
                canManageSections={canManageSections}
              />
            </div>
          ))}
        </div>

        {/* Scroll indicator for long content */}
        <div className="mt-8 flex justify-center opacity-30">
          <div className="w-8 h-1 rounded-full bg-primary/20"></div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
