
import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExpenses } from '@/hooks/useExpenses';
import { useProfile } from '@/hooks/useProfile';
import { useCan } from '@/hooks/useCan';
import { useIsMobile } from '@/hooks/use-mobile';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import PaymentsOverview from '@/components/payments/PaymentsOverview';
import AIChatAssistant from '@/components/ai/AIChatAssistant';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import RoleGuard from '@/components/RoleGuard';
import {
  Plus,
  DollarSign,
  Calendar,
  FileText,
  Check,
  X,
  Clock,
  Download,
  Filter,
  Search,
  CreditCard,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function Expenses() {
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const { can } = useCan();
  const { data: expenses = [], isLoading, createExpense, updateExpense } = useExpenses();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateExpense = async (expenseData: any) => {
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
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const pendingAmount = filteredExpenses
    .filter(expense => expense.status === 'pending')
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`${isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
        {/* Header */}
        <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>Financial Management</h1>
            <p className="text-gray-600 mt-1">
              Track expenses and manage payments
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size={isMobile ? "sm" : "default"}>
                <Plus className="mr-2 h-4 w-4" />
                {isMobile ? 'New' : 'New Expense'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Expense</DialogTitle>
                <DialogDescription>
                  Submit a new expense report for approval
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm 
                onSubmit={handleCreateExpense}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* AI Insights Panel */}
        <AIInsightsPanel type="expenses" />

        {/* Tabs for Expenses and Payments */}
        <Tabs defaultValue="expenses" className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses" className={`${isMobile ? 'text-sm' : 'flex items-center gap-2'}`}>
              <FileText className="h-4 w-4" />
              {isMobile ? '' : 'Expenses'}
            </TabsTrigger>
            <TabsTrigger value="payments" className={`${isMobile ? 'text-sm' : 'flex items-center gap-2'}`}>
              <CreditCard className="h-4 w-4" />
              {isMobile ? '' : 'Payments'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            {/* Summary Cards */}
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredExpenses.filter(e => e.status === 'pending').length} pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${filteredExpenses
                      .filter(e => new Date(e.expense_date).getMonth() === new Date().getMonth())
                      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Current month</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-4 gap-4'}`}>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="meals">Meals</SelectItem>
                      <SelectItem value="office">Office Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Expenses List */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Reports</CardTitle>
                <CardDescription>
                  {filteredExpenses.length > 0 
                    ? `Showing ${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''}`
                    : 'No expenses found'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by creating a new expense report.
                    </p>
                  </div>
                ) : (
                  <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
                    {filteredExpenses.map((expense) => (
                      <div key={expense.id} className={`border rounded-lg ${isMobile ? 'p-3' : 'p-4'} hover:bg-gray-50`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-gray-900">{expense.description}</h3>
                              <Badge className={getStatusColor(expense.status)}>
                                {expense.status}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>{expense.category}</span>
                              <span>${expense.amount}</span>
                              <span>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</span>
                            </div>
                            {expense.notes && (
                              <p className="mt-1 text-sm text-gray-600">{expense.notes}</p>
                            )}
                          </div>
                          <RoleGuard permission="approveExpenses">
                            {expense.status === 'pending' && (
                              <div className="flex space-x-2">
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
                            )}
                          </RoleGuard>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <RoleGuard roles={['supervisor', 'manager', 'admin']} fallback={
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Access Restricted</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You need supervisor, manager, or admin privileges to access payment management.
                    </p>
                  </div>
                </CardContent>
              </Card>
            }>
              <PaymentsOverview />
            </RoleGuard>
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Chat Assistant */}
      <AIChatAssistant context="expenses" />
    </div>
  );
}
