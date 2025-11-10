import { useQuery } from '@tanstack/react-query';
import { InventoryService } from '@/services/inventory';

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  recentTransactions: number;
  wasteThisWeek: number;
  prepCompletion: number;
}

export interface LowStockItem {
  name: string;
  current: number;
  min: number;
  unit: string;
  item_id: string;
}

export interface RecentActivity {
  action: string;
  item: string;
  time: string;
  type: string;
}

export function useInventoryDashboard() {
  const statsQuery = useQuery({
    queryKey: ['inventory-dashboard-stats'],
    queryFn: () => InventoryService.getDashboardStats()
  });

  const lowStockQuery = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: () => InventoryService.lowStock()
  });

  const activityQuery = useQuery({
    queryKey: ['inventory-recent-activity'],
    queryFn: () => InventoryService.getRecentActivity()
  });

  return {
    stats: statsQuery.data,
    lowStock: lowStockQuery.data || [],
    recentActivity: activityQuery.data || [],
    isLoading: statsQuery.isLoading || lowStockQuery.isLoading || activityQuery.isLoading,
    error: statsQuery.error || lowStockQuery.error || activityQuery.error
  };
}