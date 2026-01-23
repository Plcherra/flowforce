import React from 'react';
import { useNavigate } from '@/lib/router-adapter';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';

interface DashboardNavigationProps {
  isActive: boolean;
}

export function DashboardNavigation({ isActive }: DashboardNavigationProps) {
  const navigate = useNavigate();
  const { state: sidebarState } = useSidebar();
  const { t } = useTranslation();
  const isCollapsed = sidebarState === 'collapsed';

  const handleNavigation = () => {
    navigate('/app/dashboard');
  };

  return (
    <div className="w-full animate-fade-in">
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="rounded-xl w-full"
      >
        <button
          onClick={handleNavigation}
          data-active={isActive}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl border transition-all duration-300 group relative overflow-hidden ${
            isActive
              ? 'bg-primary/20 text-primary border-primary/30 shadow-lg animate-scale-in'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-primary/20 hover:shadow-md hover-scale'
          }`}
        >
          {/* Subtle gradient overlay for active state */}
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl animate-fade-in" />
          )}
          
          {/* Icon with enhanced animations */}
          <div className={`relative z-10 transition-transform duration-200 ${
            isActive ? 'scale-110' : 'group-hover:scale-105'
          }`}>
            <BarChart3 className="h-4 w-4" />
          </div>
          
          {/* Text with slide animation */}
          {!isCollapsed && (
            <span className={`relative z-10 transition-all duration-200 font-medium ${
              isActive ? '' : 'group-hover:translate-x-1'
            }`}>
              {t('common.dashboard')}
            </span>
          )}
          
          {/* Active indicator */}
          {isActive && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full animate-scale-in" />
          )}
        </button>
      </SidebarMenuButton>
    </div>
  );
}
