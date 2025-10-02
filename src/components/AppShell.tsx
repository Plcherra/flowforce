import { ReactNode, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingSpinner } from '@/components/ui/loading-states';
import ErrorBoundary from '@/components/ui/error-boundary';

interface AppShellProps {
  children?: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Persistent Sidebar - never remounts */}
        <AppSidebar />
        
        <div className="flex flex-col flex-1">
          {/* Top Navigation Bar with Sidebar Trigger */}
          <header className="h-12 flex items-center border-b border-primary/20 bg-background/95 backdrop-blur-sm shrink-0 px-2 md:px-4">
            <SidebarTrigger className="mr-2 md:mr-4" />
            <TopNavbar />
          </header>
          
          {/* Main Content - with scroll restoration and loading states */}
          <main className="flex-1 overflow-y-auto h-[calc(100dvh-3rem)]">
            <ErrorBoundary showDetails={import.meta.env.DEV}>
              <Suspense fallback={
                <div className="p-6">
                  <LoadingSpinner text="Loading page..." />
                </div>
              }>
                {children || <Outlet />}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
