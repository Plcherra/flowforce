import React from "react";
import { useNavigate } from "@/lib/router-adapter";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { ProcessedNavigationItem } from "@/hooks/useNavigationData";
import { cn } from "@/lib/utils";

interface NavigationItemProps {
  item: ProcessedNavigationItem;
}

export function NavigationItem({ item }: NavigationItemProps) {
  const navigate = useNavigate();
  const { state: sidebarState } = useSidebar();
  const { t } = useTranslation();
  const isCollapsed = sidebarState === "collapsed";

  const handleNavigation = () => {
    if (!item?.href) return;
    navigate(item.href);
  };

  const getItemLabel = (translationKey?: string) => {
    if (!translationKey) return item.name;

    const navLabel = t(`navigation.${translationKey}`);
    if (navLabel !== `navigation.${translationKey}`) return navLabel;

    const commonLabel = t(`common.${translationKey}`);
    if (commonLabel !== `common.${translationKey}`) return commonLabel;

    return item.name;
  };

  const getIcon = () => {
    // Handle emoji icons (single character)
    if (typeof item.icon === "string" && item.icon.length === 1) {
      return <span className="text-base">{item.icon}</span>;
    }

    // Handle Lucide icon names (string)
    if (typeof item.icon === "string") {
      const IconComponent = (Icons as any)[item.icon];
      if (IconComponent) {
        return <IconComponent className="h-4 w-4" />;
      }
      return <Icons.FileText className="h-4 w-4" />;
    }

    // Handle direct icon components
    if (item.icon) {
      const IconComponent = item.icon;
      return <IconComponent className="h-4 w-4" />;
    }

    return <Icons.FileText className="h-4 w-4" />;
  };

  return (
    <SidebarMenuItem className="animate-fade-in">
      <SidebarMenuButton
        asChild
        isActive={item.isActive}
        className={cn("rounded-xl", isCollapsed && "rounded-full")}
      >
        <button
          onClick={handleNavigation}
          data-active={item.isActive}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl border transition-all duration-300 group relative overflow-hidden animate-reduced-motion-safe",
            item.isActive
              ? "bg-primary/20 text-primary border-primary/30 shadow-lg animate-scale-in"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-primary/20 hover:shadow-md hover-scale",
            isCollapsed &&
              "justify-center gap-0 px-0 py-0 rounded-full border-transparent bg-transparent shadow-none overflow-visible hover:border-transparent focus-visible:ring-0",
          )}
        >
          {/* Subtle gradient overlay for active state */}
          {item.isActive && !isCollapsed && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl animate-fade-in" />
          )}

          {/* Icon with enhanced animations */}
          <div
            className={cn(
              "relative z-10 transition-transform duration-200",
              !isCollapsed &&
                (item.isActive ? "scale-110" : "group-hover:scale-105"),
            )}
          >
            {getIcon()}
          </div>

          {/* Text with slide animation */}
          {!isCollapsed && (
            <span
              className={`relative z-10 transition-all duration-200 ${
                item.isActive ? "font-medium" : "group-hover:translate-x-1"
              }`}
            >
              {getItemLabel(item.translationKey)}
            </span>
          )}

          {/* Active indicator */}
          {item.isActive && !isCollapsed && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full animate-scale-in" />
          )}
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
