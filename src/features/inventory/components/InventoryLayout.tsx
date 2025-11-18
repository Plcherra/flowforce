import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { InventoryNav } from './InventoryNav';
import { InventorySummaryBoard } from './InventorySummaryBoard';

interface InventoryLayoutProps {
  children?: React.ReactNode;
}

export function InventoryLayout({ children }: InventoryLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  const pathSegments = currentPath.split('/');
  const currentPage = pathSegments[pathSegments.length - 1] || 'dashboard';

  const getBreadcrumb = () => {
    switch (currentPage) {
      case 'inventory':
        return 'Dashboard';
      case 'cookbook':
        return 'Cookbook';
      case 'items':
        return 'Items & Setup';
      case 'counts':
        return 'Counts';
      case 'prep':
        return 'Prep & PAR';
      case 'purchasing':
        return 'Purchasing';
      case 'actions':
        return 'Waste & Actions Log';
      case 'reports':
        return 'Reports';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/25 py-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="rounded-3xl border bg-background/95 p-5 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Inventory</p>
                <h1 className="text-2xl font-semibold">Command Center</h1>
                <p className="text-sm text-muted-foreground">{getBreadcrumb()}</p>
              </div>
            </div>

            <div className="mt-6">
              <InventoryNav />
            </div>
          </div>

          <InventorySummaryBoard />
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-3xl border bg-background/95 p-4 shadow-sm"
        >
          <div className="min-h-[600px] rounded-2xl border border-dashed border-border/60 p-4">
            {children || <Outlet />}
          </div>
        </motion.main>
      </div>
    </div>
  );
}
