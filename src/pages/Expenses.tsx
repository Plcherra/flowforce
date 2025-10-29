import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses, type Expense as ExpenseRecord } from '@/hooks/useExpenses';
import { useProfile } from '@/hooks/useProfile';
import { useCan } from '@/hooks/useCan';
import { useIsMobile } from '@/hooks/use-mobile';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import PaymentsOverview from '@/components/payments/PaymentsOverview';
import AIChatAssistant from '@/components/ai/AIChatAssistant';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import RoleGuard from '@/components/RoleGuard';
import { EmployeeFinancialOverview } from '@/components/financial/EmployeeFinancialOverview';
import { ManagerFinancialOverview } from '@/components/financial/ManagerFinancialOverview';
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
} from 'lucide-react';
import { format } from 'date-fns';

type TabKey = 'employee' | 'management' | 'expenses' | 'payments';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'salary', label: 'Salary' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'software', label: 'Software' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

export default function Expenses() {
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const { can } = useCan();
  const { data: expenses = [], isLoading, createExpense, updateExpense } = useExpenses();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const normalizedRole = profile?.role?.toLowerCase() ?? '';
  const canApproveExpenses = can('approveExpenses');
  const canViewManagement =
    ['manager', 'admin', 'supervisor'].includes(normalizedRole) || canApproveExpenses;
  const canAccessPayments = canViewManagement;

  const initialTab: TabKey = canViewManagement ? 'management' : 'employee';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (canViewManagement && activeTab === 'employee') {
      setActiveTab('management');
    }
  }, [canViewManagement, activeTab]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter(expense => {
        const matchesSearch =
          expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [expenses, searchTerm, statusFilter, categoryFilter],
  );

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [filteredExpenses],
  );
  const pendingExpenses = useMemo(
    () => filteredExpenses.filter(expense => expense.status === 'pending'),
    [filteredExpenses],
  );
  const pendingAmount = useMemo(
    () => pendingExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [pendingExpenses],
  );

  const handleCreateExpense = async (
    expenseData: Omit<ExpenseRecord, 'id' | 'created_at' | 'updated_at' | 'employee' | 'approver'>,
  ) => {
    try {
      await createExpense({
        ...expenseData,
        currency: 'USD',
        status: 'pending',
        employee_id: profile?.id,
        created_by: profile?.id,
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      await updateExpense({
        id: expenseId,
        status: 'approved',
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error approving expense:', error);
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    try {
      await updateExpense({
        id: expenseId,
        status: 'rejected',
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error rejecting expense:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={isMobile ? 'space-y-4 p-4' : 'space-y-6 p-6'}>
        <div
          className={
            isMobile
              ? 'flex flex-col space-y-3'
              : 'flex items-center justify-between gap-4'
          }
        >
          <div>
            <h1 className={isMobile ? 'text-2xl font-bold' : 'text-3xl font-bold'}>
              Financial Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Consolidated view of employee earnings, labor spend, and expense approvals.
            </p>
          </div>
          {activeTab === 'expenses' ? (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size={isMobile ? 'sm' : 'default'}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isMobile ? 'Expense' : 'New Expense'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Submit a New Expense</DialogTitle>
                  <DialogDescription>
                    Record reimbursements, store purchases, or payroll adjustments for approval.
                  </DialogDescription>
                </DialogHeader>
                <ExpenseForm
                  onSubmit={handleCreateExpense}
                  onCancel={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as TabKey)} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="employee" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Employee
            </TabsTrigger>
            {canViewManagement ? (
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Management
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Expense Reports
            </TabsTrigger>
            {canAccessPayments ? (
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payroll &amp; Payments
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="employee" className="space-y-6">
            <EmployeeFinancialOverview />
          </TabsContent>

          {canViewManagement ? (
            <TabsContent value="management" className="space-y-6">
              <RoleGuard roles={['manager', 'admin', 'supervisor']} fallback={
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Management insights require supervisor or admin access.
                  </CardContent>
                </Card>
              }>
                <ManagerFinancialOverview />
                <AIInsightsPanel type="expenses" />
              </RoleGuard>
            </TabsContent>
          ) : null}

          <TabsContent value="expenses" className="space-y-6">
            <div className={isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 gap-6 md:grid-cols-3'}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">${totalAmount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredExpenses.length} record{filteredExpenses.length === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">${pendingAmount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {pendingExpenses.length} awaiting review
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Filters Applied</CardTitle>
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-muted-foreground">
                  <p>Status: {STATUS_OPTIONS.find(option => option.value === statusFilter)?.label}</p>
                  <p>
                    Category:{' '}
                    {CATEGORY_OPTIONS.find(option => option.value === categoryFilter)?.label}
                  </p>
                  <p>Search term: {searchTerm ? `"${searchTerm}"` : '—'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Filter Expenses</CardTitle>
                <CardDescription>Drill into reimbursements, payroll adjustments, and vendor spend.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 gap-4 md:grid-cols-4'}>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search description or category"
                      value={searchTerm}
                      onChange={event => setSearchTerm(event.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Reports</CardTitle>
                <CardDescription>
                  {filteredExpenses.length > 0
                    ? `Showing ${filteredExpenses.length} expense record${filteredExpenses.length === 1 ? '' : 's'}`
                    : 'No expenses found with the current filters'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Submit a new expense report to get started.
                    </p>
                  </div>
                ) : (
                  <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
                    {filteredExpenses.map(expense => (
                      <div
                        key={expense.id}
                        className={`rounded-lg border ${isMobile ? 'p-3' : 'p-4'} hover:bg-gray-50`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-gray-900">{expense.description}</h3>
                              <Badge className={getStatusColor(expense.status)}>{expense.status}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <span className="capitalize">{expense.category}</span>
                              <span>${expense.amount}</span>
                              <span>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</span>
                            </div>
                            {expense.notes ? (
                              <p className="text-sm text-gray-600">{expense.notes}</p>
                            ) : null}
                          </div>
                          {expense.status === 'pending' && (
                            <RoleGuard permission="approveExpenses">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveExpense(expense.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectExpense(expense.id)}
                                  className="text-red-600 hover:text-red-700"
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
          </TabsContent>

          {canAccessPayments ? (
            <TabsContent value="payments">
              <RoleGuard
                roles={['supervisor', 'manager', 'admin']}
                fallback={
                  <Card>
                    <CardContent className="py-6 text-center text-sm text-muted-foreground">
                      Payroll visibility requires supervisor, manager, or admin access.
                    </CardContent>
                  </Card>
                }
              >
                <PaymentsOverview />
              </RoleGuard>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <AIChatAssistant context="expenses" />
    </div>
  );
}
