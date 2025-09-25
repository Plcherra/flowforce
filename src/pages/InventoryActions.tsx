import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCan } from '@/hooks/useCan';
import InventoryTransactionForm from '@/components/inventory/InventoryTransactionForm';
import { Calculator, Trash2, Settings, ArrowRightLeft } from 'lucide-react';

export default function InventoryActions() {
  const { can } = useCan();

  if (!can('manageInventory')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Actions</h1>
          <p className="text-muted-foreground">
            Access denied. You don't have permission to perform inventory actions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Actions</h1>
          <p className="text-muted-foreground">
            Perform inventory counts, waste tracking, production, and transfers
          </p>
        </div>

        <Tabs defaultValue="counts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="counts" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Inventory Counts
            </TabsTrigger>
            <TabsTrigger value="waste" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Waste Events
            </TabsTrigger>
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Production Events
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Internal Transfers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="counts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Inventory Counts
                </CardTitle>
                <CardDescription>
                  Perform physical inventory counts and reconciliation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryTransactionForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waste" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Waste Events
                </CardTitle>
                <CardDescription>
                  Track and record inventory waste and spoilage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Waste tracking functionality will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Production Events
                </CardTitle>
                <CardDescription>
                  Record production activities and recipe consumption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Production tracking functionality will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Internal Transfers
                </CardTitle>
                <CardDescription>
                  Transfer inventory between locations and storage areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Internal transfer functionality will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}