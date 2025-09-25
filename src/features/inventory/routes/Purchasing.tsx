import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, Truck, Package, CheckCircle, Clock } from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/inventory/usePurchaseOrders';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';

// Placeholder for development
const placeholderPOs = [];
const placeholderItems = [];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'received': return 'default';
    case 'ordered': return 'secondary';
    case 'pending': return 'outline';
    case 'partial': return 'secondary';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'received': return CheckCircle;
    case 'ordered': return Truck;
    case 'pending': return Clock;
    case 'partial': return Package;
    default: return Clock;
  }
};

export default function InventoryPurchasingPage() {
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders();
  
  // Use real data when available
  const orders = purchaseOrders.length > 0 ? purchaseOrders : placeholderPOs;

  return (
    <InventoryLayout>
      <IfCan permission="inventory.purchasing.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <ShoppingCart className="h-8 w-8" />
                Purchasing
              </h1>
              <p className="text-muted-foreground">
                Purchase orders, receiving, and supplier management
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">Quick Receive</Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New PO
              </Button>
            </div>
          </div>

          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList>
              <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
              <TabsTrigger value="receiving">Receiving</TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PO List */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Recent Orders</h2>
                  {isLoading ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <div className="animate-pulse space-y-4">
                          <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : orders.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Purchase Orders</h3>
                        <p className="text-muted-foreground mb-4">
                          Create your first purchase order to get started
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    orders.map((po) => {
                      const StatusIcon = getStatusIcon(po.status);
                      
                      return (
                        <Card 
                          key={po.id}
                          className={`cursor-pointer transition-all ${selectedPO === po.id ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => setSelectedPO(po.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold">{po.po_number}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {po.supplier_name}
                                </p>
                              </div>
                              <Badge variant={getStatusColor(po.status)} className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {po.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Order Date:</span>
                                <div className="font-medium">{new Date(po.order_date).toLocaleDateString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Expected:</span>
                                <div className="font-medium">
                                  {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'TBD'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-2 pt-2 border-t">
                              <div className="text-lg font-semibold">
                                {po.total_amount ? `$${po.total_amount.toFixed(2)}` : 'TBD'}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* PO Details */}
                <div>
                  {selectedPO ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Order Items</CardTitle>
                        <CardDescription>
                          {selectedPO} - {orders.find(po => po.id === selectedPO)?.supplier_name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Order items will be displayed here</p>
                          <p className="text-sm text-muted-foreground mt-2">Once purchase order items are configured</p>
                        </div>
                        
                        <div className="flex gap-2 mt-6">
                          <Button variant="outline" className="flex-1">Edit Order</Button>
                          <Button className="flex-1">Start Receiving</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Select a Purchase Order</h3>
                        <p className="text-muted-foreground">
                          Choose an order from the list to view details and manage receiving
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="receiving" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Receiving Station
                  </CardTitle>
                  <CardDescription>
                    Process incoming deliveries and update inventory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Receiving interface will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Supplier Management
                  </CardTitle>
                  <CardDescription>
                    Manage supplier information and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Supplier management interface will be implemented here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}