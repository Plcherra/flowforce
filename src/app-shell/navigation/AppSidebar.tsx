import React, { useSyncExternalStore } from "react";
import { Building2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNavigationData } from "@/hooks/useNavigationData";
import { NavigationSection } from "@/app-shell/navigation/NavigationSection";
import { DashboardNavigation } from "@/app-shell/navigation/DashboardNavigation";
import { useSidebarScroll } from "@/hooks/useSidebarScroll";
import {
  DEFAULT_LOGO_BACKGROUND,
  getCompanyBrand,
  subscribeCompanyBrand,
} from "@/lib/theme/companyTheme";

export function AppSidebar() {
  const { processedSections, canManageSections, getIsActive } =
    useNavigationData();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  const { scrollContainerRef } = useSidebarScroll();
  const sections = Array.isArray(processedSections) ? processedSections : [];
  const canManage = Boolean(canManageSections);
  const isActiveFn =
    typeof getIsActive === "function" ? getIsActive : () => false;
  const brand = useSyncExternalStore(
    subscribeCompanyBrand,
    getCompanyBrand,
    getCompanyBrand,
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-primary/20 animate-fade-in animate-reduced-motion-safe"
    >
      <SidebarHeader className="border-b border-primary/20 p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-1">
        <div
          className={
            isCollapsed
              ? "flex items-center justify-center"
              : "mb-4 flex items-center justify-center animate-fade-in"
          }
        >
          <div
            className={
              isCollapsed
                ? "flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg p-1"
                : "flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl p-1.5 shadow-sm hover-scale transition-all duration-300 hover:shadow-lg"
            }
            style={{
              backgroundColor: brand.logoBackground || DEFAULT_LOGO_BACKGROUND,
            }}
          >
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt="Company logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2
                className={
                  isCollapsed
                    ? "h-4 w-4 text-[hsl(var(--logo-foreground,var(--primary-foreground)))]"
                    : "h-7 w-7 text-[hsl(var(--logo-foreground,var(--primary-foreground)))] transition-transform duration-200 hover:scale-110"
                }
              />
            )}
          </div>
        </div>

        <DashboardNavigation isActive={isActiveFn("/dashboard")} />
      </SidebarHeader>

      <SidebarContent
        ref={scrollContainerRef}
        className="scroll-smooth overflow-y-auto border-t border-primary/10 px-4 py-6 group-data-[collapsible=icon]:overflow-x-hidden group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:[scrollbar-width:none] group-data-[collapsible=icon]:[&::-webkit-scrollbar]:hidden"
        style={{
          scrollBehavior: "smooth",
          scrollbarWidth: isCollapsed ? "none" : "thin",
          scrollbarColor: isCollapsed
            ? "transparent"
            : "hsl(var(--primary) / 0.3) transparent",
        }}
      >
        {/* Navigation Sections with staggered animation */}
        <div
          className={
            isCollapsed
              ? "flex w-full flex-col items-center space-y-2"
              : "space-y-6"
          }
        >
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={
                isCollapsed
                  ? "flex w-full justify-center animate-fade-in"
                  : "animate-fade-in"
              }
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <NavigationSection
                section={section}
                canManageSections={canManage}
              />
            </div>
          ))}
        </div>

        {isCollapsed ? null : (
          <div className="mt-8 flex justify-center opacity-30">
            <div className="h-1 w-8 rounded-full bg-primary/20" />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
