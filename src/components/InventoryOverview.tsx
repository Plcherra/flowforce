import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useInventoryItems } from '@/hooks/inventory/useInventoryItems';
import { useInventoryTransactions } from '@/hooks/inventory/useInventoryTransactions';
import InventoryItemForm from '@/components/inventory/InventoryItemForm';
import InventoryTransactionForm from '@/components/inventory/InventoryTransactionForm';
import { useCan } from '@/hooks/useCan';

export default function InventoryOverview() {
  const { data: items = [], isLoading: itemsLoading } = useInventoryItems();
  const { data: transactions = [], isLoading: transactionsLoading } = useInventoryTransactions();
  const { can } = useCan();

  if (itemsLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const lowStockItems = items.filter(item => 
    item.min_stock_level && (item.min_stock_level || 0) <= 10
  );

  const totalValue = items.reduce((sum, item) => 
    sum + ((item.min_stock_level || 0) * (item.cost_per_unit || 0)), 0
  );

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Items below minimum level</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {can('manageInventory') && (
        <div className="flex gap-4">
          <InventoryItemForm />
          <InventoryTransactionForm />
        </div>
      )}

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {item.min_stock_level || 0} / {item.max_stock_level || 0} units
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {transaction.transaction_type === 'purchase' || transaction.transaction_type === 'return' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{transaction.item?.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        transaction.transaction_type === 'purchase' || transaction.transaction_type === 'return' 
                          ? 'default' 
                          : 'secondary'
                      }>
                        {transaction.transaction_type === 'purchase' || transaction.transaction_type === 'return' ? '+' : '-'}
                        {transaction.quantity} units
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}