import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { InventoryNav } from './InventoryNav';

interface InventoryLayoutProps {
  children?: React.ReactNode;
}

export function InventoryLayout({ children }: InventoryLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract current page from pathname
  const currentPath = location.pathname;
  const pathSegments = currentPath.split('/');
  const currentPage = pathSegments[pathSegments.length - 1] || 'dashboard';
  
  // Generate breadcrumb
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Inventory</h1>
              <p className="text-sm text-muted-foreground">{getBreadcrumb()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <InventoryNav />

      {/* Content */}
      <div className="min-h-[600px]">
        {children || <Outlet />}
      </div>
    </div>
  );
}