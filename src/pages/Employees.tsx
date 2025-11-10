
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Mail, Phone, Building2, MoreHorizontal, Truck, AlertTriangle } from 'lucide-react';
import { useInventorySuppliers, useCreateSupplier } from '@/hooks/useInventory';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Tables } from '@/integrations/supabase/public-types';
import { EmployeeDrawer, type EmployeeDrawerTab } from '@/components/employees/EmployeeDrawer';
import { TeamActionsBar } from '@/components/employees/TeamActionsBar';
import { InviteEmployeeDialog } from '@/components/employees/InviteEmployeeDialog';
import { RoleManagerDialog } from '@/components/employees/RoleManagerDialog';
import { PermissionManagerDialog } from '@/components/employees/PermissionManagerDialog';
import { useEmployees, type Employee as DirectoryEmployee } from '@/hooks/useEmployees';
import { employeesRepository } from '@/repositories/employeesRepository';

type Department = Tables<'departments'>;

export default function Employees() {
  const isMobile = useIsMobile();
  const { profile: currentUserProfile, loading: profileLoading } = useProfile();
  const companyId = currentUserProfile?.company_id ?? currentUserProfile?.companyId ?? null;
  const { employees, loading, error: employeesError, refetchEmployees } = useEmployees({ includeInactive: true });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'managers' | 'inactive' | 'vendors'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<DirectoryEmployee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<EmployeeDrawerTab>('profile');
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const [permissionManagerOpen, setPermissionManagerOpen] = useState(false);

  // Vendor hooks
  const {
    data: vendors = [],
    isLoading: vendorsLoading,
    error: vendorsError
  } = useInventorySuppliers(companyId);
  const createVendor = useCreateSupplier();

  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    if (inviteParam && ['1', 'true', 'open'].includes(inviteParam.toLowerCase())) {
      setInviteOpen(true);
    }
  }, [searchParams]);

  const clearInviteParam = () => {
    const inviteParam = searchParams.get('invite');
    if (!inviteParam) return;
    const next = new URLSearchParams(searchParams);
    next.delete('invite');
    setSearchParams(next, { replace: true });
  };

  const handleInviteChange = (open: boolean) => {
    setInviteOpen(open);
    if (!open) {
      clearInviteParam();
    }
  };

  const handleDrawerChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedEmployee(null);
      setDrawerTab('profile');
    }
  };

  const openEmployeeDrawer = (employee: DirectoryEmployee) => {
    setSelectedEmployee(employee);
    setDrawerTab('profile');
    setDrawerOpen(true);
    clearInviteParam();
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVendor.mutateAsync(vendorForm);
      setShowAddVendorDialog(false);
      setVendorForm({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const fetchDepartments = useCallback(async () => {
    if (!companyId) {
      if (!profileLoading) {
        setDepartmentError('Department filters need an active company assignment. Ask an admin to link your profile and refresh.');
      }
      setDepartments([]);
      return;
    }

    try {
      const data = await employeesRepository.fetchDepartmentsByCompany(companyId);
      setDepartments(data || []);
      setDepartmentError(null);
    } catch (unknownErr) {
      console.error('Error fetching departments:', unknownErr);
      setDepartmentError('Department filters are unavailable right now. Once Supabase is back online, refresh to restore filters.');
      setDepartments([]);
    }
  }, [companyId, profileLoading]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, departmentFilter]);

  const getDepartmentName = (departmentId: string | null, directName?: string | null) => {
    if (directName) return directName;
    if (!departmentId) return 'Unassigned';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const baseList = employees ?? [];

    let list = baseList.filter((employee) => {
      const fullName = `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim().toLowerCase();
      const email = employee.email?.toLowerCase() ?? '';
      const employeeId = employee.employee_id?.toLowerCase() ?? '';

      if (!term) return true;
      return fullName.includes(term) || email.includes(term) || employeeId.includes(term);
    });

    if (activeTab === 'managers') {
      list = list.filter((employee) => {
        const role = employee.role?.toLowerCase() ?? '';
        return role === 'manager' || role === 'admin';
      });
    } else if (activeTab === 'inactive') {
      list = list.filter((employee) => (employee.employment_status ?? '').toLowerCase() !== 'active');
    }

    if (departmentFilter !== 'all') {
      list = list.filter((employee) => employee.department_id === departmentFilter);
    }

    return list;
  }, [employees, searchTerm, activeTab, departmentFilter]);

  // Filtered vendors for vendors tab
  const filteredVendors = useMemo(() => {
    if (activeTab !== 'vendors') return [];
    const term = searchTerm.trim().toLowerCase();
    return (vendors ?? []).filter((vendor) => {
      if (!term) return true;
      const contact = vendor.contact_name?.toLowerCase() ?? '';
      const email = vendor.email?.toLowerCase() ?? '';
      return vendor.name.toLowerCase().includes(term) || contact.includes(term) || email.includes(term);
    });
  }, [vendors, searchTerm, activeTab]);

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const paginatedVendors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, page, pageSize]);

  const activeEmployeesCount = useMemo(
    () => employees.filter((employee) => (employee.employment_status ?? '').toLowerCase() === 'active').length,
    [employees],
  );
  const inactiveEmployeesCount = useMemo(
    () => employees.filter((employee) => (employee.employment_status ?? '').toLowerCase() !== 'active').length,
    [employees],
  );
  const leaderCount = useMemo(
    () =>
      employees.filter((employee) => {
        const role = employee.role?.toLowerCase() ?? '';
        return role === 'manager' || role === 'admin';
      }).length,
    [employees],
  );

  const totalRecords = activeTab === 'vendors' ? filteredVendors.length : filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const hasResults = totalRecords > 0;
  const displayRangeStart = hasResults ? (page - 1) * pageSize + 1 : 0;
  const displayRangeEnd = hasResults ? Math.min(page * pageSize, totalRecords) : 0;
  const combinedError = employeesError ?? departmentError;
  const vendorErrorMessage = useMemo(() => {
    if (!companyId && !profileLoading) {
      return 'Connect your profile to a company to see vendor records.';
    }
    if (!vendorsError) return null;
    if (vendorsError instanceof Error) return vendorsError.message;
    if (typeof vendorsError === 'string') return vendorsError;
    return 'We couldn’t load vendor data. Try refreshing once Supabase is back online.';
  }, [companyId, profileLoading, vendorsError]);
  const isVendorSectionLoading = vendorsLoading || (profileLoading && !companyId);

  useEffect(() => {
    setPage((current) => (current > totalPages ? totalPages : current));
  }, [totalPages]);

  const paginationSequence = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const sequence: Array<number | 'start-ellipsis' | 'end-ellipsis'> = [1];
    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);

    if (page <= 3) {
      start = 2;
      end = 4;
    } else if (page >= totalPages - 2) {
      start = totalPages - 3;
      end = totalPages - 1;
    }

    if (start > 2) {
      sequence.push('start-ellipsis');
    }

    for (let current = start; current <= end; current += 1) {
      sequence.push(current);
    }

    if (end < totalPages - 1) {
      sequence.push('end-ellipsis');
    }

    sequence.push(totalPages);
    return sequence;
  }, [page, totalPages]);

  const currentRole = currentUserProfile?.role?.toLowerCase() ?? '';
  const isAdmin = ['owner', 'admin', 'manager'].includes(currentRole);
  const canManageEmployees = ['admin', 'manager'].includes(currentRole);

  return (
    <div>
      <div className={`${isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
        {/* Header */}
        <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between gap-3'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>Team Directory</h1>
            <p className="text-gray-600 mt-1">
              Browse, filter and export your company roster
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageEmployees && activeTab === 'vendors' && (
              <Dialog open={showAddVendorDialog} onOpenChange={setShowAddVendorDialog}>
                <DialogTrigger asChild>
                  <Button size={isMobile ? 'sm' : 'default'}>
                    <Truck className="mr-2 h-4 w-4" />
                    {isMobile ? 'Add' : 'Add Vendor'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateVendor} className="space-y-4">
                    <div>
                      <Label htmlFor="vendor-name">Company Name *</Label>
                      <Input
                        id="vendor-name"
                        value={vendorForm.name}
                        onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-name">Contact Name</Label>
                      <Input
                        id="contact-name"
                        value={vendorForm.contact_name}
                        onChange={(e) => setVendorForm({ ...vendorForm, contact_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vendor-email">Email</Label>
                        <Input
                          id="vendor-email"
                          type="email"
                          value={vendorForm.email}
                          onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vendor-phone">Phone</Label>
                        <Input
                          id="vendor-phone"
                          value={vendorForm.phone}
                          onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="vendor-address">Address</Label>
                      <Textarea
                        id="vendor-address"
                        value={vendorForm.address}
                        onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vendor-notes">Notes</Label>
                      <Textarea
                        id="vendor-notes"
                        value={vendorForm.notes}
                        onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddVendorDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createVendor.isPending}>
                        {createVendor.isPending ? 'Adding...' : 'Add Vendor'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <TeamActionsBar
              isAdmin={isAdmin}
              onOpenInvite={() => handleInviteChange(true)}
              onOpenRoles={() => setRoleManagerOpen(true)}
              onOpenPermissions={() => setPermissionManagerOpen(true)}
              onExportFiltered={() => exportCSV(filteredEmployees)}
              onExportAll={() => exportCSV(employees)}
            />
          </div>
        </div>

        {combinedError && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
              <div className="space-y-1">
                <AlertTitle>Live data unavailable</AlertTitle>
                <AlertDescription>{combinedError}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Toolbar */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="all">All ({employees.length})</TabsTrigger>
                  <TabsTrigger value="managers">Leads ({leaderCount})</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive ({inactiveEmployeesCount})</TabsTrigger>
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-initial md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search name, email, or ID"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Content for different tabs */}
              <TabsContent value={activeTab}>
                {activeTab === 'vendors' ? (
                  vendorErrorMessage ? (
                    <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
                        <div className="space-y-1">
                          <AlertTitle>Vendor data unavailable</AlertTitle>
                          <AlertDescription>{vendorErrorMessage}</AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ) : isVendorSectionLoading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 w-full bg-muted/40 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30%]">Company Name</TableHead>
                            <TableHead className="hidden md:table-cell">Contact</TableHead>
                            <TableHead className="hidden md:table-cell">Email</TableHead>
                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedVendors.map((vendor) => (
                            <TableRow key={vendor.id} className="hover:bg-muted/30">
                              <TableCell>
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-orange-100 text-orange-600">
                                      <Truck className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">
                                      {vendor.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      Vendor
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {vendor.contact_name || '—'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{vendor.email || '—'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{vendor.phone || '—'}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        {filteredVendors.length === 0 && !isVendorSectionLoading && (
                          <TableCaption>No vendors match your filters.</TableCaption>
                        )}
                      </Table>
                    </div>
                  )
                ) : (
                  // Employees table
                  loading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 w-full bg-muted/40 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[42%] md:w-[30%]">Name</TableHead>
                          <TableHead className="hidden md:table-cell">Role</TableHead>
                          <TableHead className="hidden md:table-cell">Department</TableHead>
                          <TableHead className="hidden md:table-cell">Hire Date</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEmployees.map((employee) => (
                          <TableRow key={employee.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={employee.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {employee.first_name[0]}
                                    {employee.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">
                                    {employee.first_name} {employee.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{employee.email}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell capitalize">
                              <Badge variant="outline">{employee.role}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span>{getDepartmentName(employee.department_id ?? null, employee.department?.name ?? null)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant={employee.employment_status === 'active' ? 'default' : 'secondary'}>
                                {employee.employment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEmployeeDrawer(employee)}
                                aria-label="View Profile"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {filteredEmployees.length === 0 && !loading && (
                        <TableCaption>No employees match your filters.</TableCaption>
                      )}
                    </Table>
                    </div>
                  )
                )}
              </TabsContent>
            </Tabs>

            {/* Pagination controls */}
            {hasResults && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Showing {displayRangeStart}–{displayRangeEnd} of {totalRecords}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map((s) => (
                        <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => page > 1 && setPage((p) => Math.max(1, p - 1))}
                          className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={page === 1}
                        />
                      </PaginationItem>
                      {paginationSequence.map((item, index) =>
                        typeof item === 'number' ? (
                          <PaginationItem key={item}>
                            <PaginationLink
                              isActive={item === page}
                              onClick={() => setPage(item)}
                              className="cursor-pointer"
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={`${item}-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => page < totalPages && setPage((p) => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={page === totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Team Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'} text-center`}>
              <div>
                <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                <div className="text-sm text-gray-600">People</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {activeEmployeesCount}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {leaderCount}
                </div>
                <div className="text-sm text-gray-600">Leads</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {departments.length}
                </div>
                <div className="text-sm text-gray-600">Departments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Drawer */}
        <EmployeeDrawer
          employee={selectedEmployee}
          open={drawerOpen}
          initialTab={drawerTab}
          onOpenChange={handleDrawerChange}
        />

        <InviteEmployeeDialog
          open={inviteOpen}
          onOpenChange={handleInviteChange}
          onSuccess={refetchEmployees}
        />

        <RoleManagerDialog
          open={roleManagerOpen}
          onOpenChange={setRoleManagerOpen}
          employees={employees}
          onRoleUpdated={refetchEmployees}
        />

        <PermissionManagerDialog
          open={permissionManagerOpen}
          onOpenChange={setPermissionManagerOpen}
        />
      </div>
    </div>
  );
}

// Helpers
function exportCSV(data: DirectoryEmployee[]) {
  const headers = [
    'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Department ID', 'Employee ID', 'Hire Date'
  ];
  const rows = data.map(e => [
    e.first_name,
    e.last_name,
    e.email,
    e.role,
    e.employment_status,
    e.department_id ?? '',
    e.employee_id ?? '',
    e.hire_date ? new Date(e.hire_date).toISOString().split('T')[0] : ''
  ]);

  const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
