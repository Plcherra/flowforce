import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/useCan";
import {
  ShoppingCart,
  Truck,
  History,
  Calendar,
  Calculator,
  FileText,
  CreditCard,
  Scan,
} from "lucide-react";

export default function Purchasing() {
  const { can } = useCan();

  if (!can("manageInventory")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchasing</h1>
          <p className="text-muted-foreground">
            Access denied. You don't have permission to manage purchasing
            operations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchasing</h1>
          <p className="text-muted-foreground">
            Manage purchase orders, receiving, and accounting operations
          </p>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Place Orders
            </TabsTrigger>
            <TabsTrigger value="receive" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Receive Orders
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Order History
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Weekly Schedules
            </TabsTrigger>
            <TabsTrigger value="accounting" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Accounting
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Credit Reminders
            </TabsTrigger>
            <TabsTrigger value="scanned" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Scanned Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Place Orders
                </CardTitle>
                <CardDescription>
                  Create and submit new purchase orders to suppliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Order placement functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Receive Orders
                </CardTitle>
                <CardDescription>
                  Process incoming deliveries and update inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Order receiving functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Order History
                </CardTitle>
                <CardDescription>
                  View and manage historical purchase orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Order history functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Schedules
                </CardTitle>
                <CardDescription>
                  Plan and schedule recurring purchase orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Weekly scheduling functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Accounting
                </CardTitle>
                <CardDescription>
                  Financial accounting and purchase tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Accounting functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoices
                </CardTitle>
                <CardDescription>
                  Manage supplier invoices and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Invoice management functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Credit Reminders
                </CardTitle>
                <CardDescription>
                  Manage payment reminders and credit notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Credit reminder functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scanned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Scanned Invoices
                </CardTitle>
                <CardDescription>
                  Process and manage digitally scanned invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Scanned invoice processing will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
