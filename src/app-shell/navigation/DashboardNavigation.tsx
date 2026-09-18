import React from "react";
import { useNavigate } from "@/lib/router-adapter";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardNavigationProps {
  isActive: boolean;
}

export function DashboardNavigation({ isActive }: DashboardNavigationProps) {
  const navigate = useNavigate();
  const { state: sidebarState } = useSidebar();
  const { t } = useTranslation();
  const isCollapsed = sidebarState === "collapsed";

  const handleNavigation = () => {
    navigate("/app/dashboard");
  };

  return (
    <div className="w-full animate-fade-in group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn("w-full rounded-xl", isCollapsed && "rounded-full")}
      >
        <button
          onClick={handleNavigation}
          data-active={isActive}
          className={cn(
            "relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-300 group",
            isActive
              ? "border-primary/30 bg-primary/20 text-primary shadow-lg animate-scale-in"
              : "border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-primary hover:shadow-md hover-scale",
            isCollapsed &&
              "justify-center gap-0 overflow-visible rounded-full border-transparent bg-transparent px-0 py-0 shadow-none hover:border-transparent",
          )}
        >
          {isActive && !isCollapsed && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-transparent animate-fade-in" />
          )}

          <div
            className={cn(
              "relative z-10 transition-transform duration-200",
              !isCollapsed && (isActive ? "scale-110" : "group-hover:scale-105"),
            )}
          >
            <BarChart3 className="h-4 w-4" />
          </div>

          {!isCollapsed && (
            <span
              className={cn(
                "relative z-10 font-medium transition-all duration-200",
                !isActive && "group-hover:translate-x-1",
              )}
            >
              {t("common.dashboard")}
            </span>
          )}

          {isActive && !isCollapsed && (
            <div className="absolute right-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary animate-scale-in" />
          )}
        </button>
      </SidebarMenuButton>
    </div>
  );
}
