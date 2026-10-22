import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { can } = useCan();

  if (!can("manageInventory")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("common.purchasing")}</h1>
          <p className="text-muted-foreground">
            {t("inventory.accessDeniedYouDonTHavePermissionToManagePurchasingOperations")} </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("common.purchasing")}</h1>
          <p className="text-muted-foreground">
            {t("inventory.managePurchaseOrdersReceivingAndAccountingOperations")} </p>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t("inventory.placeOrders")} </TabsTrigger>
            <TabsTrigger value="receive" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {t("inventory.receiveOrders")} </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t("inventory.orderHistory")} </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("inventory.weeklySchedules")} </TabsTrigger>
            <TabsTrigger value="accounting" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {t("navigation.accounting")} </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("common.invoices")} </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t("inventory.creditReminders")} </TabsTrigger>
            <TabsTrigger value="scanned" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              {t("inventory.scannedInvoices")} </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t("inventory.placeOrders")} </CardTitle>
                <CardDescription>
                  {t("inventory.createAndSubmitNewPurchaseOrdersToSuppliers")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.orderPlacementFunctionalityWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  {t("inventory.receiveOrders")} </CardTitle>
                <CardDescription>
                  {t("inventory.processIncomingDeliveriesAndUpdateInventory")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.orderReceivingFunctionalityWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t("inventory.orderHistory")} </CardTitle>
                <CardDescription>
                  {t("inventory.viewAndManageHistoricalPurchaseOrders")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.orderHistoryFunctionalityWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("inventory.weeklySchedules")} </CardTitle>
                <CardDescription>
                  {t("inventory.planAndScheduleRecurringPurchaseOrders")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.weeklySchedulingFunctionalityWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  {t("navigation.accounting")} </CardTitle>
                <CardDescription>
                  {t("inventory.financialAccountingAndPurchaseTracking")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.accountingFunctionalityWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("common.invoices")} </CardTitle>
                <CardDescription>
                  {t("inventory.manageSupplierInvoicesAndPayments")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.invoiceManagementFunctionalityWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("inventory.creditReminders")} </CardTitle>
                <CardDescription>
                  {t("inventory.managePaymentRemindersAndCreditNotifications")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.creditReminderFunctionalityWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scanned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  {t("inventory.scannedInvoices")} </CardTitle>
                <CardDescription>
                  {t("inventory.processAndManageDigitallyScannedInvoices")} </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("inventory.scannedInvoiceProcessingWillBeImplementedHere")} </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
