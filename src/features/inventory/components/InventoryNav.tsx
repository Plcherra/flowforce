import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Package, 
  Receipt, 
  Calculator, 
  ShoppingCart, 
  ClipboardList, 
  FileText,
  ChefHat
} from 'lucide-react';
import { IfCan } from '@/components/permissions/IfCan';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const navItems = [
  {
    name: 'Dashboard',
    href: '/inventory',
    icon: BarChart3,
    permission: 'inventory.view' as const,
  },
  {
    name: 'Cookbook',
    href: '/inventory/cookbook',
    icon: ChefHat,
    permission: 'inventory.view' as const,
    featureFlag: 'inventory.cookbook',
  },
  {
    name: 'Items & Setup',
    href: '/inventory/items',
    icon: Package,
    permission: 'inventory.view' as const,
  },
  {
    name: 'Counts',
    href: '/inventory/counts',
    icon: Receipt,
    permission: 'inventory.counts.view' as const,
  },
  {
    name: 'Prep & PAR',
    href: '/inventory/prep',
    icon: Calculator,
    permission: 'inventory.prep.view' as const,
  },
  {
    name: 'Purchasing',
    href: '/inventory/purchasing',
    icon: ShoppingCart,
    permission: 'inventory.purchasing.view' as const,
  },
  {
    name: 'Waste & Actions',
    href: '/inventory/actions',
    icon: ClipboardList,
    permission: 'inventory.waste.view' as const,
  },
  {
    name: 'Reports',
    href: '/inventory/reports',
    icon: FileText,
    permission: 'reports.view' as const,
  },
];

export function InventoryNav() {
  const location = useLocation();
  const featureFlags = useFeatureFlags();

  return (
    <nav className="flex space-x-1 bg-muted p-1 rounded-lg">
      {navItems.map((item) => {
        // Check feature flag if specified
        if (item.featureFlag && !featureFlags.isEnabled(item.featureFlag)) {
          return null;
        }

        return (
          <IfCan key={item.href} permission={item.permission}>
            <NavLink
              to={item.href}
              end={item.href === '/inventory'}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </NavLink>
          </IfCan>
        );
      })}
    </nav>
  );
}