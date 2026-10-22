import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useExpenses,
  type Expense as ExpenseRecord,
} from "@/hooks/useExpenses";
import {
  asArray,
  safeArrayFilter,
  safeArrayReduce,
} from "@/utils/reactQueryTypes";
import { useProfile } from "@/hooks/useProfile";
import { useCan } from "@/hooks/useCan";
import { useIsMobile } from "@/hooks/use-mobile";
import ExpenseForm from "@/features/inventory/components/expenses/ExpenseForm";
import PaymentsOverview from "@/features/inventory/components/expenses/PaymentsOverview";
import RoleGuard from "@/app-shell/guards/RoleGuard";
import { logger } from "@/utils/logger";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  User,
  Building2,
  FileText,
  CreditCard,
  DollarSign,
  Clock,
  Search,
  Filter,
  Download,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";

const AIInsightsPanel = lazy(() =>
  import("@/features/ai/components/AIInsightsPanel").then((m) => ({
    default: m.default,
  })),
);
const EmployeeFinancialOverview = lazy(() =>
  import("@/features/inventory/components/expenses/EmployeeFinancialOverview").then(
    (m) => ({
      default: m.EmployeeFinancialOverview,
    }),
  ),
);
const ManagerFinancialOverview = lazy(() =>
  import("@/features/inventory/components/expenses/ManagerFinancialOverview").then(
    (m) => ({
      default: m.ManagerFinancialOverview,
    }),
  ),
);

type TabKey = "employee" | "management" | "expenses" | "payments";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "salary", label: "Salary" },
  { value: "bonus", label: "Bonus" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "supplies", label: "Supplies" },
  { value: "equipment", label: "Equipment" },
  { value: "software", label: "Software" },
  { value: "utilities", label: "Utilities" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

const tabSkeleton = <Skeleton className="h-[400px] w-full rounded-xl" />;

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
    case "paid":
      return "bg-success-muted text-success";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    case "pending":
      return "bg-warning-muted text-warning-foreground";
    default:
      return "bg-muted text-foreground";
  }
}

function ExpenseReportsTab() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const {
    data: expensesData,
    isLoading,
    isError,
    createExpense,
    updateExpense,
  } = useExpenses();
  const expenses = asArray(expensesData);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesSearch =
          expense.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" || expense.status === statusFilter;
        const matchesCategory =
          categoryFilter === "all" || expense.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [expenses, searchTerm, statusFilter, categoryFilter],
  );

  const totalAmount = useMemo(
    () =>
      safeArrayReduce(
        filteredExpenses,
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      ),
    [filteredExpenses],
  );
  const pendingExpenses = useMemo(
    () =>
      safeArrayFilter(
        filteredExpenses,
        (expense) => expense.status === "pending",
      ),
    [filteredExpenses],
  );
  const pendingAmount = useMemo(
    () =>
      safeArrayReduce(
        pendingExpenses,
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      ),
    [pendingExpenses],
  );

  const handleCreateExpense = async (
    expenseData: Omit<
      ExpenseRecord,
      "id" | "created_at" | "updated_at" | "employee" | "approver"
    >,
  ) => {
    try {
      await createExpense({
        ...expenseData,
        currency: "USD",
        status: "pending",
        employee_id: profile?.id,
        created_by: profile?.id,
      });
      setShowCreateDialog(false);
    } catch (error) {
      logger.error("Error creating expense:", { error, tags: ["error"] });
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      await updateExpense({
        id: expenseId,
        status: "approved",
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
      });
    } catch (error) {
      logger.error("Error approving expense:", { error, tags: ["error"] });
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    try {
      await updateExpense({
        id: expenseId,
        status: "rejected",
        approved_by: null,
        approved_at: null,
        rejected_by: profile?.id ?? null,
        rejected_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error rejecting expense:", { error, tags: ["error"] });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("inventory.unableToLoadExpenseReportsRightNowTryRefreshingThePage")} </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={
          isMobile
            ? "flex flex-col space-y-3"
            : "flex items-center justify-end gap-4"
        }
      >
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size={isMobile ? "sm" : "default"}>
              <Plus className="mr-2 h-4 w-4" />
              {isMobile ? "Expense" : "New Expense"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("inventory.submitANewExpense")}</DialogTitle>
              <DialogDescription>
                {t("inventory.recordReimbursementsStorePurchasesOrPayrollAdjustmentsForApproval")} </DialogDescription>
            </DialogHeader>
            <ExpenseForm
              onSubmit={handleCreateExpense as any}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div
        className={
          isMobile
            ? "grid grid-cols-1 gap-3"
            : "grid grid-cols-1 gap-6 md:grid-cols-3"
        }
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inventory.totalExpenses")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              ${totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} {t("inventory.record")} {filteredExpenses.length === 1 ? "" : "s"}
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
            <div className="text-2xl font-semibold">
              ${pendingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingExpenses.length} {t("inventory.awaitingReview")} </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("inventory.filtersApplied")}</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              {t("inventory.status")}{" "}
              {
                STATUS_OPTIONS.find((option) => option.value === statusFilter)
                  ?.label
              }
            </p>
            <p>
              {t("updates.category")}{" "}
              {
                CATEGORY_OPTIONS.find(
                  (option) => option.value === categoryFilter,
                )?.label
              }
            </p>
            <p>{t("inventory.searchTerm")} {searchTerm ? `"${searchTerm}"` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.filterExpenses")}</CardTitle>
          <CardDescription>
            {t("inventory.drillIntoReimbursementsPayrollAdjustmentsAndVendorSpend")} </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={
              isMobile
                ? "grid grid-cols-1 gap-3"
                : "grid grid-cols-1 gap-4 md:grid-cols-4"
            }
          >
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("inventory.searchDescriptionOrCategory")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("schedule.status")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.category")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t("schedule.export")} </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.expenseReports")}</CardTitle>
          <CardDescription>
            {filteredExpenses.length > 0
              ? `Showing ${filteredExpenses.length} expense record${filteredExpenses.length === 1 ? "" : "s"}`
              : "No expenses found with the current filters"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                {t("inventory.noExpenses")} </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("inventory.submitANewExpenseReportToGetStarted")} </p>
            </div>
          ) : (
            <div className={isMobile ? "space-y-3" : "space-y-4"}>
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`rounded-lg border ${isMobile ? "p-3" : "p-4"} hover:bg-muted`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">
                          {expense.description}
                        </h3>
                        <Badge className={getStatusColor(expense.status)}>
                          {expense.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{expense.category}</span>
                        <span>${expense.amount}</span>
                        <span>
                          {format(
                            new Date(expense.expense_date),
                            "MMM d, yyyy",
                          )}
                        </span>
                      </div>
                      {expense.notes ? (
                        <p className="text-sm text-muted-foreground">{expense.notes}</p>
                      ) : null}
                    </div>
                    {expense.status === "pending" && (
                      <RoleGuard permission="approveExpenses">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveExpense(expense.id)}
                            className="text-success hover:text-success/80"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectExpense(expense.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </RoleGuard>
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

export default function Expenses() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { profile, isReady } = useProfile();
  const { can } = useCan();

  const normalizedRole = profile?.role?.toLowerCase() ?? "";
  const canApproveExpenses = can("approveExpenses");
  const canViewManagement =
    ["manager", "admin", "supervisor", "owner"].includes(normalizedRole) ||
    canApproveExpenses;
  const canAccessPayments = canViewManagement;

  const [activeTab, setActiveTab] = useState<TabKey>("employee");
  const [tabInitialized, setTabInitialized] = useState(false);

  useEffect(() => {
    if (!isReady || tabInitialized) return;
    setActiveTab(canViewManagement ? "management" : "employee");
    setTabInitialized(true);
  }, [isReady, canViewManagement, tabInitialized]);

  useEffect(() => {
    if (!isReady) return;
    if (activeTab === "management" && !canViewManagement) {
      setActiveTab("employee");
    }
    if (activeTab === "payments" && !canAccessPayments) {
      setActiveTab("employee");
    }
  }, [isReady, activeTab, canViewManagement, canAccessPayments]);

  return (
    <div className={isMobile ? "space-y-4 p-4" : "space-y-6 p-6"}>
      <div>
        <h1 className={isMobile ? "text-2xl font-bold" : "text-3xl font-bold"}>
          {t("common.financialManagement")} </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.consolidatedViewOfEmployeeEarningsLaborSpendAndExpenseApprovals")} </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
        className="space-y-6"
      >
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="employee" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("schedule.employee")} </TabsTrigger>
          {canViewManagement ? (
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t("inventory.management")} </TabsTrigger>
          ) : null}
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("inventory.expenseReports")} </TabsTrigger>
          {canAccessPayments ? (
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t("inventory.payrollPayments")} </TabsTrigger>
          ) : null}
        </TabsList>

        {activeTab === "employee" ? (
          <TabsContent value="employee" className="space-y-6">
            <Suspense fallback={tabSkeleton}>
              <EmployeeFinancialOverview />
            </Suspense>
          </TabsContent>
        ) : null}

        {activeTab === "management" && canViewManagement ? (
          <TabsContent value="management" className="space-y-6">
            <RoleGuard
              roles={["manager", "admin", "supervisor", "owner"]}
              fallback={
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    {t("inventory.managementInsightsRequireSupervisorOrAdminAccess")} </CardContent>
                </Card>
              }
            >
              <Suspense fallback={tabSkeleton}>
                <ManagerFinancialOverview />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                <AIInsightsPanel type="expenses" />
              </Suspense>
            </RoleGuard>
          </TabsContent>
        ) : null}

        {activeTab === "expenses" ? (
          <TabsContent value="expenses" className="space-y-6">
            <ExpenseReportsTab />
          </TabsContent>
        ) : null}

        {activeTab === "payments" && canAccessPayments ? (
          <TabsContent value="payments">
            <RoleGuard
              roles={["supervisor", "manager", "admin", "owner"]}
              fallback={
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    {t("inventory.payrollVisibilityRequiresSupervisorManagerOrAdminAccess")} </CardContent>
                </Card>
              }
            >
              <PaymentsOverview />
            </RoleGuard>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
