import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayments } from "@/hooks/usePayments";
import { useProfile } from "@/hooks/useProfile";
import { useCan } from "@/hooks/useCan";
import { DollarSign, Clock, Check, X, Search } from "lucide-react";
import PaymentForm from "./PaymentForm";
import { format } from "date-fns";
import { logger } from "@/utils/logger";

export default function PaymentsOverview() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { profile } = useProfile();
  const { can } = useCan();
  const { payments, isLoading, updatePayment } = usePayments();

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    const matchesType =
      typeFilter === "all" || payment.payment_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleApprovePayment = async (paymentId: string) => {
    try {
      await updatePayment.mutateAsync({
        id: paymentId,
        status: "approved",
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
      });
    } catch (error) {
      logger.error("Error approving payment:", { error, tags: ["error"] });
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      await updatePayment.mutateAsync({
        id: paymentId,
        status: "rejected",
        approved_by: null,
        approved_at: null,
        rejected_by: profile?.id ?? null,
        rejected_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error rejecting payment:", { error, tags: ["error"] });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success-muted text-success";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      case "pending":
        return "bg-warning-muted text-warning-foreground";
      case "paid":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-foreground";
    }
  };

  const totalAmount = filteredPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const pendingAmount = filteredPayments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("inventory.totalPayments")} </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredPayments.length === 1
                ? t("inventory.onePayment", { count: filteredPayments.length })
                : t("inventory.manyPayments", { count: filteredPayments.length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("inventory.pendingApproval")} </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${pendingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredPayments.filter((p) => p.status === "pending").length}{" "}
              {t("inventory.pending")} </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inventory.thisMonth")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {filteredPayments
                .filter(
                  (p) =>
                    new Date(p.created_at).getMonth() === new Date().getMonth(),
                )
                .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{t("inventory.currentMonth")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <PaymentForm />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.filterPayments")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("inventory.searchPayments")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("inventory.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("schedule.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("inventory.pending2")}</SelectItem>
                <SelectItem value="approved">{t("inventory.approved2")}</SelectItem>
                <SelectItem value="rejected">{t("inventory.rejected")}</SelectItem>
                <SelectItem value="paid">{t("schedule.paid")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("tasks.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("inventory.allTypes")}</SelectItem>
                <SelectItem value="wage">{t("inventory.employeeWage")}</SelectItem>
                <SelectItem value="vendor">{t("inventory.vendorPayment")}</SelectItem>
                <SelectItem value="expense_reimbursement">
                  {t("inventory.expenseReimbursement")} </SelectItem>
                <SelectItem value="other">{t("schedule.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.paymentRecords")}</CardTitle>
          <CardDescription>
            {filteredPayments.length === 0
              ? t("inventory.noPaymentsFound")
              : filteredPayments.length === 1
                ? t("inventory.showingOnePayment", { count: filteredPayments.length })
                : t("inventory.showingManyPayments", { count: filteredPayments.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                {t("inventory.noPayments")} </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("inventory.getStartedByCreatingANewPayment")} </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-4 hover:bg-muted"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-foreground">
                          {payment.description}
                        </h3>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{payment.recipient_name}</span>
                        <span>${payment.amount}</span>
                        <span>{payment.payment_type}</span>
                        <span>
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                    {can("approveExpenses") && payment.status === "pending" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprovePayment(payment.id)}
                          className="text-success hover:text-success/80"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectPayment(payment.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
